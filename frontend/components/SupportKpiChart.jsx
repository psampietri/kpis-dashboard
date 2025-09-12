import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

const SupportKpiChart = ({ kpis }) => {
    if (!kpis || !kpis.byType) {
        return <p>No support KPI data available.</p>;
    }

    const chartData = Object.entries(kpis.byType).map(([key, value]) => ({
        name: key,
        Backlog: value.backlog,
        'In Progress': value.inProgress,
        Done: value.done,
    }));

    return (
        <div className="card">
            <h2>Support Ticket Status</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="name" stroke="#ccc" />
                        <YAxis stroke="#ccc" />
                        <Tooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #555' }} />
                        <Legend />
                        <Bar dataKey="Backlog" stackId="a" fill="#facc15" />
                        <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="Done" stackId="a" fill="#42b883" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SupportKpiChart;