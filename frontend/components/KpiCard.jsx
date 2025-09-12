import React from 'react';
import '../css/KpiCard.css';

const KpiCard = ({ value, label }) => {
  return (
    <div className="kpi-card">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
};

export default KpiCard;