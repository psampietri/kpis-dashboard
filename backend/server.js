const express = require('express');
const cors = require('cors');
const config = require('./config');
// Import all necessary functions from our service and calculation modules
const jiraService = require('./jira-service');
const calculations = require('./calculations');

const app = express();
const PORT = 7001;

app.use(cors());

// The main API endpoint that gathers and processes all data
app.get('/api/dashboard-data', async (req, res) => {
  console.log('Received request for dashboard data...');
  try {
    const rawTrees = await jiraService.fetchInitiativeTreesByLabel(config.JIRA_LABEL);
    const processedTrees = calculations.calculateInitiativeTrees(rawTrees);
    
    const supportIssues = await jiraService.fetchAllDescendantIssues(config.SUPPORT_INITIATIVE_KEY, false);
    const supportKpis = calculations.calculateSupportKpis(supportIssues);

    const overallCompletion = calculations.calculateOverallCompletion(processedTrees);

    // --- THIS SECTION CONTAINS THE FIX ---
    const timeTrackingData = {};
    for (const category of config.TIME_TRACKING_CONFIG) {
        const issues = await jiraService.fetchIssuesByLabel(category.label);
        // Pass the start and end dates from the config file here
        const result = calculations.calculateTimeSpent(issues, config.TIME_FRAME_START, config.TIME_FRAME_END);
        timeTrackingData[category.key] = {
            title: category.title,
            label: category.label,
            hours: result.totalHours,
            ticketCount: issues.length
        };
    }
    
    res.json({
      success: true,
      data: processedTrees,
      overallCompletion,
      supportKpis,
      timeTrackingData,
      tshirtFieldId: config.TSHIRT_FIELD_ID
    });
    console.log('Successfully sent dashboard data.');

  } catch (error) {
    console.error('Error in /api/dashboard-data endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// NEW: Endpoint to get the list of available sprints
app.get('/api/sprints', async (req, res) => {
  try {
    const sprints = await jiraService.fetchSprints(config.JIRA_AGILE_BOARD_ID);
    res.json({ success: true, sprints });
  } catch (error) {
    console.error('Error in /api/sprints endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// NEW: Endpoint to get the calculated progress for a specific sprint
app.get('/api/sprint-progress/:sprintId', async (req, res) => {
  try {
    const { sprintId } = req.params;
    const sprintReport = await jiraService.fetchSprintReport(config.JIRA_AGILE_BOARD_ID, sprintId);
    
    // CHANGED: A single call now gets all sprint calculations.
    const sprintProgress = calculations.calculateSprintProgress(sprintReport, config.TSHIRT_FIELD_ID);
    
    // The timeBreakdown is now included inside the sprintProgress object.
    res.json({ success: true, sprintProgress });
    
  } catch (error) {
    console.error(`Error in /api/sprint-progress/${req.params.sprintId} endpoint:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Jira Dashboard Backend listening on http://localhost:${PORT}`);
});