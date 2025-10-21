# Jira KPIs Dashboard 📊

## 1. Overview

This project is a **full-stack web application** designed to fetch, calculate, and visualize **key performance indicators (KPIs)** from a Jira instance. It consists of a **Node.js backend** that serves a REST API and a **React frontend** (built with Vite) that provides an interactive dashboard.

The dashboard focuses on two main areas:

* **OKR Progress:** A hierarchical tree view of "**Initiatives**" and their child issues, showing weighted completion progress based on T-shirt size.
* **Sprint Progress:** A detailed breakdown of the current or past sprints, including scope changes (**carry-over, added scope**), completion status, and time spent.

---

### Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express.js, Axios |
| **Frontend** | React, Vite, Axios, Recharts, React-Arborist |

---

## 2. Local Setup Guide

Follow these steps to run the application on your local machine.

### Prerequisites

* **Node.js:** You must have Node.js (which includes `npm`) installed on your system.
* **Jira Access:** You need an active Jira account with access to the project specified in the configuration.
* **Jira Session Token:** You must be able to retrieve your Jira session cookie.

---

### Step 1: Backend Setup

The backend server is responsible for communicating with the Jira API.

1.  **Navigate to the Backend Directory:**
    ```bash
    cd path/to/project/backend
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
    *This installs Express, Axios, and Cors.*
3.  **Create Configuration File:**
    * In the `backend` directory, find the **`config.js.example`** file.
    * Create a copy of this file and name it **`config.js`**.
    * *(The `.gitignore` file is already configured to ignore `config.js`.)*
4.  **Edit `config.js`:**
    You must fill in the following two variables:
    * `JIRA_DOMAIN`: Your company's Jira domain (e.g., `your-company.atlassian.net`).
    * `JIRA_SESSION_COOKIE`: Your `tenant.session.token` value.

    > **How to get your session cookie:**
    > 1. Log in to your Jira instance in a web browser.
    > 2. Open the browser's Developer Tools (`F12`).
    > 3. Go to the "**Application**" (in Chrome) or "**Storage**" (in Firefox) tab.
    > 4. Find the "**Cookies**" section and select your Jira domain.
    > 5. Find the cookie named **`tenant.session.token`** and copy its "**Value**".
5.  **Start the Backend Server:**
    ```bash
    npm start
    ```
    *The server will start on `http://localhost:7001`.*

---

### Step 2: Frontend Setup

The frontend is a React application that displays the data from the backend.

1.  **Navigate to the Frontend Directory:**
    ```bash
    cd path/to/project/frontend
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
    *This installs React, Vite, Axios, and other charting/tree libraries.*
3.  **Start the Frontend Development Server:**
    ```bash
    npm run dev
    ```
4.  **Access the Application:**
    Vite will output a local URL to your console (usually `http://localhost:5173`). Open this URL in your browser to view the dashboard.

---

## 3. Project Functionalities

The application is composed of several key components that fetch and display data.

### Backend API

The **Express server** provides three main endpoints:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/dashboard-data` | `GET` | **Primary dashboard load.** Fetches all Initiatives matching `JIRA_LABEL` from the config, recursively builds a weighted completion tree, and also fetches support KPIs and time tracking data. |
| `/api/sprints` | `GET` | Fetches a list of all sprints (closed, active, future) for the Agile board specified in `config.JIRA_AGILE_BOARD_ID`. |
| `/api/sprint-progress/:sprintId` | `GET` | Fetches a detailed sprint report for the given `sprintId`. Gathers all issues (completed, not completed, punted) with their changelogs, and returns a calculated object containing progress percentages and breakdowns. |

---

### Frontend Components

The frontend (`App.jsx`) is structured into two main sections:

#### 1. OKR Progress (`InitiativeTree.jsx`)

This component renders a collapsible tree table using **`react-arborist`**.

* **Data:** Displays the hierarchical initiative data from the `/api/dashboard-data` endpoint.
* **Columns:**
    * **Key:** The Jira issue key. An arrow (`▶`/`▼`) allows expanding/collapsing parent issues.
    * **Summary:** The issue summary.
    * **Status:** The current status of the issue.
    * **Completion:** A progress bar showing the **weighted completion percentage**. For parent issues, this is a roll-up of all its children's progress.
    * **Issues:** A count of all descendant issues.
* **Weighted Calculation:** The completion logic in the backend (`calculations.js`) uses a `COMPLEXITY_MAP` (**S=2, M=5, L=8, XL=13**) based on the **T-shirt size** custom field to weight the progress of leaf nodes. Parent node progress is the weighted average of its children.

#### 2. Sprint Progress (`SprintProgress.jsx`)

This component provides a detailed view of a single sprint.

* **Sprint Selector:** A dropdown menu populated from the `/api/sprints` endpoint allows the user to select any sprint. It defaults to the **"active" sprint** if one exists.
* **Overall Progress:** A large progress bar shows the overall sprint completion, which is **weighted by T-shirt size** (completed weight / total weight).
* **Scope Breakdown:** A grid of stats showing how the sprint scope was composed:
    * **Carry Over:** Issues from a previous sprint.
    * **New Planned:** Issues added to the sprint before it started.
    * **Scope Added:** Issues added during the sprint.
    * **Punted:** Issues removed from the sprint before it ended.
* **Status Breakdown:** A grid showing the final state of all issues that were part of the sprint:
    * **Completed:** Issues that were finished.
    * **Not Completed:** Issues that remained unfinished at the sprint's end.
* **Time Spent Breakdown:** Shows time logged against completed tickets, categorized by:
    * **Total Time Spent**
    * **Planned Work** (Time on Carry Over + New Planned issues)
    * **Scope Added** (Time on issues added mid-sprint)
* **Interactive Lists:** Clicking on any of the stat boxes in the "**Scope**" or "**Status**" breakdowns will toggle a table displaying the list of all issues in that specific category (e.g., clicking "Punted" shows a table of all punted issues).