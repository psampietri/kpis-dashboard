import React from 'react';

const TimeTrackingTable = ({ timeData }) => {
    if (!timeData) {
        return <p>No time tracking data available.</p>;
    }

    const data = Object.values(timeData);

    return (
        <div className="card">
            <h2>Time Tracking Summary</h2>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Tickets</th>
                        <th>Total Hours</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr key={item.label}>
                            <td>{item.title}</td>
                            <td>{item.ticketCount}</td>
                            <td>{item.hours.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TimeTrackingTable;