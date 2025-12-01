import React from "react";
import { EdgeProps } from "reactflow";

// Helper to offset a point by dx, dy
function offsetPoint(x: number, y: number, dx: number, dy: number) {
  return { x: x + dx, y: y + dy };
}

// Snap direction to horizontal (0 or 180 degrees) based on relative position
function getHorizontalDirection(x1: number, y1: number, x2: number, y2: number) {
  return x2 > x1 ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 };
}

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  selected,
}) => {
  // Use horizontal direction for the orange lines
  const { dx: dxS, dy: dyS } = getHorizontalDirection(sourceX, sourceY, targetX, targetY);
  const { dx: dxT, dy: dyT } = getHorizontalDirection(targetX, targetY, sourceX, sourceY);

  // Offset both ends by 10px horizontally
  const start = offsetPoint(sourceX, sourceY, dxS * 10, dyS * 10);
  const end = offsetPoint(targetX, targetY, dxT * 10, dyT * 10);

  // Use a simple bezier path between start and end
  const c1 = offsetPoint(start.x, start.y, (end.x - start.x) / 2, 0);
  const c2 = offsetPoint(end.x, end.y, -(end.x - start.x) / 2, 0);

  const edgePath = `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;

  const lineColor = selected ? "red" : "blue";
  const debugColor = "orange";

  return (
    <g>
      {/* Line from table to start of path (horizontal only) */}
      <line
        x1={sourceX}
        y1={sourceY}
        x2={start.x}
        y2={start.y}
        stroke={debugColor}
        strokeWidth={2}
      />
      {/* Main curved path */}
      <path
        id={id}
        d={edgePath}
        stroke={lineColor}
        strokeWidth={2}
        fill="none"
        markerEnd={markerEnd}
      />
      {/* Line from end of path to table (horizontal only) */}
      <line
        x1={end.x}
        y1={end.y}
        x2={targetX}
        y2={targetY}
        stroke={debugColor}
        strokeWidth={2}
      />
    </g>
  );
};

export default CustomEdge;