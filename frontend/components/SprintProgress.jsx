import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/SprintProgress.css';

const ProgressBar = ({ value, label }) => {
    const percentage = Math.round(value * 100);
    return (
        <div className="sprint-progress-bar-container" data-label={`${percentage}%`}>
            <div className="sprint-progress-bar" style={{ width: `${percentage}%` }}>
            </div>
        </div>
    );
};

const SprintIssueList = ({ title, issues }) => (
    <div className="sprint-issue-list">
        <h4>{title} ({issues.length})</h4>
        {issues.length > 0 ? (
            <table>
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Summary</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {issues.map(issue => (
                        <tr key={issue.key}>
                            <td>{issue.key}</td>
                            <td>{issue.fields.summary}</td>
                            <td>{issue.fields.status.name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : <p>No issues in this category.</p>}
    </div>
);

const SprintProgress = () => {
    const [sprints, setSprints] = useState([]);
    const [selectedSprintId, setSelectedSprintId] = useState('');
    const [sprintData, setSprintData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleList, setVisibleList] = useState(null);

    useEffect(() => {
        axios.get('http://localhost:7001/api/sprints')
            .then(response => {
                const activeSprint = response.data.sprints.find(s => s.state === 'active');
                setSprints(response.data.sprints);
                if (activeSprint) {
                    setSelectedSprintId(activeSprint.id);
                } else if (response.data.sprints.length > 0) {
                    setSelectedSprintId(response.data.sprints[0].id);
                }
            })
            .catch(error => console.error("Failed to fetch sprints", error));
    }, []);

    useEffect(() => {
        if (!selectedSprintId) return;

        setVisibleList(null);
        setIsLoading(true);
        axios.get(`http://localhost:7001/api/sprint-progress/${selectedSprintId}`)
            .then(response => {
                setSprintData(response.data.sprintProgress);
                setIsLoading(false);
            })
            .catch(error => {
                console.error(`Failed to fetch sprint data for sprint ${selectedSprintId}`, error);
                setIsLoading(false);
            });
    }, [selectedSprintId]);

    const toggleVisibleList = (listName) => {
        setVisibleList(current => (current === listName ? null : listName));
    };

    return (
        <div className="card">
            <div className="sprint-header">
                <h2>Sprint Progress</h2>
                <select value={selectedSprintId} onChange={e => setSelectedSprintId(e.target.value)}>
                    {sprints.map(sprint => (
                        <option key={sprint.id} value={sprint.id}>
                            {sprint.name} ({sprint.state})
                        </option>
                    ))}
                </select>
            </div>

            {isLoading ? (<p>Loading sprint data...</p>) : sprintData ? (
                <div className="sprint-content">
                    <ProgressBar value={sprintData.progress} />

                    {/* --- SCOPE BREAKDOWN SECTION --- */}
                    <h3 className="section-title">Scope Breakdown</h3>
                    <div className="sprint-stats-grid">
                        <div className="stat-box" onClick={() => toggleVisibleList('carryOver')}>
                            <div className="stat-value carry-over">{sprintData.scope.carryOver.count}</div>
                            <div className="stat-label">Carry Over</div>
                        </div>
                        <div className="stat-box" onClick={() => toggleVisibleList('newPlanned')}>
                            <div className="stat-value">{sprintData.scope.newPlanned.count}</div>
                            <div className="stat-label">New Planned</div>
                        </div>
                        <div className="stat-box" onClick={() => toggleVisibleList('added')}>
                            <div className="stat-value added">+{sprintData.scope.added.count}</div>
                            <div className="stat-label">Scope Added</div>
                        </div>
                        <div className="stat-box" onClick={() => toggleVisibleList('punted')}>
                            <div className="stat-value punted">{sprintData.scope.punted.count > 0 ? `-${sprintData.scope.punted.count}` : 0}</div>
                            <div className="stat-label">Punted</div>
                        </div>
                    </div>

                    {/* --- STATUS BREAKDOWN SECTION --- */}
                    <h3 className="section-title">Status Breakdown</h3>
                    <div className="sprint-stats-grid status-grid">
                        <div className="stat-box" onClick={() => toggleVisibleList('completed')}>
                            <div className="stat-value">{sprintData.status.completed.count}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                        <div className="stat-box" onClick={() => toggleVisibleList('notCompleted')}>
                            <div className="stat-value">{sprintData.status.notCompleted.count}</div>
                            <div className="stat-label">Not Completed</div>
                        </div>
                    </div>

                    {sprintData.timeBreakdown && (
                        <>
                            <h3 className="section-title">Time Spent Breakdown (Completed Tickets)</h3>
                            <div className="sprint-stats-grid time-grid">
                                <div className="stat-box">
                                    <div className="stat-value time-value">{sprintData.timeBreakdown.totalHours.toFixed(1)}h</div>
                                    <div className="stat-label">Total Time Spent</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value time-value">{sprintData.timeBreakdown.plannedHours.toFixed(1)}h</div>
                                    <div className="stat-label">Planned Work</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value time-value">{sprintData.timeBreakdown.addedHours.toFixed(1)}h</div>
                                    <div className="stat-label">Scope Added</div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- DYNAMIC ISSUE LISTS --- */}
                    {visibleList === 'carryOver' && <SprintIssueList title="Carried Over Issues" issues={sprintData.scope.carryOver.issues} />}
                    {visibleList === 'newPlanned' && <SprintIssueList title="New Planned Issues" issues={sprintData.scope.newPlanned.issues} />}
                    {visibleList === 'added' && <SprintIssueList title="Issues Added Mid-Sprint" issues={sprintData.scope.added.issues} />}
                    {visibleList === 'punted' && <SprintIssueList title="Punted Issues" issues={sprintData.scope.punted.issues} />}
                    {visibleList === 'completed' && <SprintIssueList title="Completed Issues" issues={sprintData.status.completed.issues} />}
                    {visibleList === 'notCompleted' && <SprintIssueList title="Issues Not Completed" issues={sprintData.status.notCompleted.issues} />}
                </div>
            ) : (<p>No data available.</p>)}
        </div>
    );
};


export default SprintProgress;