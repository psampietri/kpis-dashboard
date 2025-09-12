import React, { useState, useEffect } from 'react';
import axios from 'axios';
import KpiCard from '../components/KpiCard';
// FIX: Import InitiativeTree instead of InitiativeTable
import InitiativeTree from '../components/InitiativeTree';
import SupportKpiChart from '../components/SupportKpiChart';
import TimeTrackingTable from '../components/TimeTrackingTable';
import ErrorBoundary from '../components/ErrorBoundary';
import SprintProgress from '../components/SprintProgress';
import '../css/Dashboard.css';

// The URL for your Node.js backend API
const API_URL = 'http://localhost:7001/api/dashboard-data';

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // No need to set isLoading and error here, as they are handled by the initial state and finally block
        const response = await axios.get(API_URL);
        if (response.data.success) {
          console.log("RAW DATA FROM BACKEND:", JSON.stringify(response.data.data, null, 2));
          setDashboardData(response.data);
        } else {
          throw new Error(response.data.error || 'An unknown error occurred.');
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // The empty array ensures this effect runs only once on component mount

  if (isLoading) {
    return <div className="loading-message">Loading Dashboard Data...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        <h2>Failed to load dashboard</h2>
        <p>{error}</p>
        <p>Please ensure the backend server is running and the Jira credentials in `config.js` are correct.</p>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available.</div>;
  }

  // The 'data' property now contains the hierarchical tree structure
  const { overallCompletion, data, supportKpis, timeTrackingData } = dashboardData;

  return (
    <>
      <h1>Production Support Dashboard</h1>

      <div className="grid">
        <KpiCard value={`${(overallCompletion * 100).toFixed(1)}%`} label="Overall Weighted Completion" />
        {/* <KpiCard value={supportKpis.totals.total} label="Total Support Tickets" />
        <KpiCard value={supportKpis.totals.inProgress} label="Support Tickets In Progress" />
        <KpiCard value={supportKpis.totals.backlog} label="Support Tickets in Backlog" /> */}
      </div>

      {/* FIX: Use the new InitiativeTree component and pass the 'data' to it */}
      <ErrorBoundary>
        <InitiativeTree initiatives={data} />
      </ErrorBoundary>

      <SprintProgress />

      {/* <div className="grid">
        <SupportKpiChart kpis={supportKpis} />
        <TimeTrackingTable timeData={timeTrackingData} />
      </div> */}
    </>
  );
}

export default App;