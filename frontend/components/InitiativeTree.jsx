import React from 'react';
import { Tree } from "react-arborist"; // Import the library component
import '../css/Dashboard.css';

// --- UPDATED ProgressBar COMPONENT ---
const ProgressBar = ({ value }) => {
  const percentage = Math.round(value * 100);
  return (
    // The container is now a positioning context for the label
    <div className="progress-bar-container">
      {/* This is the colored bar that grows */}
      <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
      {/* This is the text label that sits on top */}
      <span className="progress-bar-label">{percentage}%</span>
    </div>
  );
};

// --- Custom Node Renderer ---
// This component defines how each row in the tree should look.
// The library passes special props like `node`, `style`, and `dragHandle`.
const Node = ({ node, style, dragHandle }) => {
  // `node.data` holds our original issue object
  const issue = node.data;

  return (
    // The library provides the style prop for virtualization
    <div ref={dragHandle} style={style} className="tree-row">
      <div className="tree-cell key-cell">
        {/* The library provides helpers to show a toggle arrow */}
        <span onClick={() => node.toggle()} style={{ cursor: 'pointer' }}>
            {node.isLeaf ? null : (node.isOpen ? "▼" : "▶")}
        </span>
        <span style={{ marginLeft: '10px' }}>{issue.key}</span>
      </div>
      <div className="tree-cell summary-cell">{issue.fields?.summary}</div>
      <div className="tree-cell status-cell">{issue.fields?.status?.name}</div>
      {/* The component reads the pre-calculated completion from the issue object */}
      <div className="tree-cell progress-cell"><ProgressBar value={issue.completion} /></div>
      <div className="tree-cell count-cell">{issue.issueCount}</div>
    </div>
  );
};


// --- The Main Tree Component ---
const InitiativeTree = ({ initiatives }) => {
  if (!initiatives || initiatives.length === 0) {
    return <p>No initiative data available.</p>;
  }

  // The library requires each node to have a unique `id`. We can use our `key`.
  const treeData = initiatives.map(init => ({ ...init, id: init.key }));

  return (
    <div className="card">
      <h2>OKR Progress</h2>
      <div className="tree-container">
        {/* Header Row */}
        <div className="tree-row header">
          <div className="tree-cell key-cell">Key</div>
          <div className="tree-cell summary-cell">Summary</div>
          <div className="tree-cell status-cell">Status</div>
          <div className="tree-cell progress-cell">Completion</div>
          <div className="tree-cell count-cell">Issues</div>
        </div>
        
        {/* The Tree component from the react-arborist library */}
        <Tree
          initialData={treeData}
          openByDefault={false} // Start with all nodes collapsed
          width="100%"
          height={400} // Set a fixed height for performance (virtualization)
          indent={24}   // The indentation space for each level
        >
          {Node}
        </Tree>
      </div>
    </div>
  );
};

export default InitiativeTree;