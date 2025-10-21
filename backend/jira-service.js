const axios = require('axios');
const config = require('./config');

const logger = {
  info: (message, ...args) => console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...args),
  debug: (message, ...args) => console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args),
  error: (message, ...args) => console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args),
};

// You can adjust this value if you see rate-limiting errors.
const API_CONCURRENCY_LIMIT = 5;

// Common configuration for all Jira API clients
const commonAxiosConfig = {
  timeout: 30000,
  headers: {
    'Cookie': `tenant.session.token=${config.JIRA_SESSION_COOKIE}`,
    'Content-Type': 'application/json'
  }
};

// --- API CLIENTS ---
// 1. The client for the main Jira Platform API
const jiraApi = axios.create({
  baseURL: `https://${config.JIRA_DOMAIN}/rest/api/3`,
  ...commonAxiosConfig
});

// 2. A dedicated client for the Jira Agile API
const jiraAgileApi = axios.create({
  baseURL: `https://${config.JIRA_DOMAIN}/rest/agile/1.0`,
  ...commonAxiosConfig
});

// 3. A dedicated client for the legacy Greenhopper API (for sprint reports)
const jiraGreenhopperApi = axios.create({
  baseURL: `https://${config.JIRA_DOMAIN}/rest/greenhopper/1.0`,
  ...commonAxiosConfig
});


// Global error handler for the main API client
jiraApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data, config: reqConfig } = error.response;
      logger.error(`API Error on ${reqConfig.method.toUpperCase()} ${reqConfig.url} | Status: ${status}`);
      if (data) logger.error("Jira Response Body:", JSON.stringify(data, null, 2));
    } else if (error.request) {
      logger.error("Network Error: No response received from Jira server.", error.message);
    } else {
      logger.error('Axios setup error:', error.message);
    }
    return Promise.reject(error);
  }
);


// --- Core Helper Functions ---

async function searchWithTokenPagination(jql) {
  logger.debug(`Searching for keys with JQL: "${jql}"`);
  const payload = { jql, fields: ["key"], maxResults: 1000 };
  const response = await jiraApi.post('/search/jql', payload);
  return (response.data.issues || []).map(issue => issue.key);
}

async function bulkFetchIssueDetails(issueKeys, fields = [], expand = []) {
  if (!issueKeys || issueKeys.length === 0) return [];
  
  const BATCH_SIZE = 100; // Jira's stated maximum limit
  let allIssues = [];
  logger.info(`Starting bulk fetch for ${issueKeys.length} issues in batches of ${BATCH_SIZE}.`);

  const fieldsToFetch = [...new Set([
    'summary', 'status', 'issuetype', config.JIRA_HIERARCHY_FIELD, ...fields
  ])];

  if (config.TSHIRT_FIELD_ID) {
    fieldsToFetch.push(config.TSHIRT_FIELD_ID);
  }

  for (let i = 0; i < issueKeys.length; i += BATCH_SIZE) {
    const batchKeys = issueKeys.slice(i, i + BATCH_SIZE);
    logger.debug(`Fetching details for batch of ${batchKeys.length} issues (starting with ${batchKeys[0]}).`);
    
    const payload = { issueIdsOrKeys: batchKeys, fields: fieldsToFetch, expand };
    
    try {
      const response = await jiraApi.post('/issue/bulkfetch', payload);
      allIssues.push(...(response.data.issues || []));
    } catch (error) {
      logger.error(`Failed to fetch batch starting with key ${batchKeys[0]}. Skipping batch.`);
    }
  }
  
  logger.info(`Bulk fetch complete. Retrieved details for ${allIssues.length} issues.`);
  return allIssues;
}


// --- Main Tree-Building Logic ---

async function fetchIssueTree(issueKey) {
  const issueDetails = await bulkFetchIssueDetails([issueKey]);
  if (!issueDetails || issueDetails.length === 0) { return null; }
  
  const currentNode = issueDetails[0];
  currentNode.children = [];

  const jql = `${config.JIRA_HIERARCHY_FIELD} = "${issueKey}"`;
  const childKeys = await searchWithTokenPagination(jql);

  if (childKeys.length > 0) {
    for (let i = 0; i < childKeys.length; i += API_CONCURRENCY_LIMIT) {
      const batch = childKeys.slice(i, i + API_CONCURRENCY_LIMIT);
      const batchPromises = batch.map(key => fetchIssueTree(key));
      const childTrees = await Promise.all(batchPromises);
      currentNode.children.push(...childTrees.filter(tree => tree !== null));
    }
  } else {
    currentNode.children = null;
  }
  return currentNode;
}

async function fetchInitiativeTreesByLabel(label) {
  const initiativeKeys = await searchWithTokenPagination(`project = "APPS" and type = "Initiative" and labels = '${label}' and labels not in ('Out_of_scope') ORDER BY Rank`);
  if (initiativeKeys.length === 0) return [];

  let finalTrees = [];
  for (let i = 0; i < initiativeKeys.length; i += API_CONCURRENCY_LIMIT) {
      const batch = initiativeKeys.slice(i, i + API_CONCURRENCY_LIMIT);
      const treePromises = batch.map(key => fetchIssueTree(key));
      const initiativeTrees = await Promise.all(treePromises);
      finalTrees.push(...initiativeTrees.filter(tree => tree !== null));
  }
  
  return finalTrees;
}


// --- Sprint-Related Functions ---

async function fetchSprints(boardId) {
  logger.info(`Fetching sprints for board ID: ${boardId}`);
  const response = await jiraAgileApi.get(`/board/${boardId}/sprint?state=closed,active,future`);
  
  return (response.data.values || []).sort((a, b) => {
    if (a.state === 'future' && b.state !== 'future') return -1;
    if (b.state === 'future' && a.state !== 'future') return 1;
    return new Date(b.startDate) - new Date(a.startDate);
  });
}

async function fetchSprintReport(boardId, sprintId) {
  logger.info(`Fetching sprint report for board ${boardId}, sprint ${sprintId}`);
  const response = await jiraGreenhopperApi.get(`/rapid/charts/sprintreport?rapidViewId=${boardId}&sprintId=${sprintId}`);
  
  const reportContents = response.data.contents;
  const issueKeys = new Set([
    ...reportContents.completedIssues.map(i => i.key),
    ...reportContents.issuesNotCompletedInCurrentSprint.map(i => i.key),
    ...reportContents.puntedIssues.map(i => i.key),
  ]);

  // --- THIS IS THE CHANGE ---
  // We now expand the changelog for every issue to get its history.
  const allIssues = await bulkFetchIssueDetails(Array.from(issueKeys), [], ['changelog']);
  const issuesMap = new Map(allIssues.map(i => [i.key, i]));
  
  return {
    sprint: response.data.sprint, // Pass sprint details like start date
    completedIssues: reportContents.completedIssues.map(i => issuesMap.get(i.key)).filter(Boolean),
    issuesNotCompleted: reportContents.issuesNotCompletedInCurrentSprint.map(i => issuesMap.get(i.key)).filter(Boolean),
    puntedIssues: reportContents.puntedIssues.map(i => issuesMap.get(i.key)).filter(Boolean),
    issueKeysAddedDuringSprint: new Set(Object.keys(reportContents.issueKeysAddedDuringSprint || {})),
  };
}


// --- Supporting Fetch Functions for Other KPIs ---

async function fetchAllDescendantIssues(parentKey, includeTshirtField) {
  let allDescendantKeys = new Set();
  let keysToSearch = [parentKey];
  let processedKeys = new Set(keysToSearch);

  while (keysToSearch.length > 0) {
    let jql;
    const quotedKeys = keysToSearch.map(key => `"${key}"`);
    
    if (keysToSearch.length === 1) {
      jql = `${config.JIRA_HIERARCHY_FIELD} = ${quotedKeys[0]}`;
    } else {
      jql = `${config.JIRA_HIERARCHY_FIELD} in (${quotedKeys.join(',')})`;
    }
    
    const foundKeys = await searchWithTokenPagination(jql);
    const newKeysForNextLevel = [];
    foundKeys.forEach(key => {
      if (!processedKeys.has(key)) {
        newKeysForNextLevel.push(key);
        processedKeys.add(key);
        allDescendantKeys.add(key);
      }
    });
    keysToSearch = newKeysForNextLevel;
  }
  
  const descendantKeysArray = Array.from(allDescendantKeys);
  if (descendantKeysArray.length === 0) return [];
  
  const fieldsToFetch = includeTshirtField ? [config.TSHIRT_FIELD_ID] : [];
  return await bulkFetchIssueDetails(descendantKeysArray, fieldsToFetch);
}

async function fetchIssuesByLabel(label) {
  const jql = `project = "APPS" and type = "Initiative" and labels = '${label}' and labels not in ('Out_of_scope')`;
  const fields = ['summary', 'status', 'created'];
  const expand = ['changelog'];

  const issueKeys = await searchWithTokenPagination(jql);
  if (issueKeys.length === 0) return [];

  return await bulkFetchIssueDetails(issueKeys, fields, expand);
}


module.exports = {
  fetchInitiativeTreesByLabel,
  fetchAllDescendantIssues,
  fetchIssuesByLabel,
  fetchSprints,
  fetchSprintReport,
};