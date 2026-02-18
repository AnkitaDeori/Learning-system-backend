import { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

export default function GraphView() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    fetch("http://localhost:5000/lesson-graph/L1")
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ height: "600px", border: "1px solid black" }}>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="label"
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
      />
    </div>
  );
}
