import { getStraightPath, useStore } from 'reactflow';
import React from "react";
import { EdgeProps } from "reactflow";

// Helper to offset a point by dx, dy
function offsetPoint(x: number, y: number, dx: number, dy: number) {
  return { x: x + dx, y: y + dy };
}

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  // sourceX,
  sourceY,
  // targetX,
  targetY,
  // markerEnd,
  selected,
  source,
  target
}) => {

  function createRectangle(node: any, yPos: number) {
    return {
      left: node.position.x,
      top: yPos,
      width: node.width,
      height: node.height,
      right: node.position.x + node.width,
      bottom: yPos + node.height,
      GetX(onLeft: boolean) {
        return onLeft ? this.left : this.right;
      },
    };
  }
  const sourceNode = useStore(s => s.nodeInternals.get(source)) as any;
  const targetNode = useStore(s => s.nodeInternals.get(target)) as any;
  const sourceRectangle = createRectangle(sourceNode, sourceY);
  const targetRectangle = createRectangle(targetNode, targetY);

  var sourceOnLeft = sourceNode.position.x < targetNode.position.x;
  var targetOnLeft = sourceNode.position.x >= targetNode.position.x;

  var a_x1 = targetRectangle.GetX(sourceOnLeft);
  var a_x2 = targetRectangle.GetX(sourceOnLeft) + (sourceOnLeft ? -25 : 25)

  var b_x1 = sourceRectangle.GetX(targetOnLeft);
  var b_x2 = sourceRectangle.GetX(targetOnLeft) + (targetOnLeft ? -25 : 25)

  const [edgePath] = getStraightPath({
    sourceX: a_x2,
    sourceY: targetRectangle.top,
    targetX: b_x2,
    targetY: sourceRectangle.top,
  });

  return (
    <g>
      {/* Line from table to start of path (horizontal only) */}
      <line
        x1={a_x1}
        y1={targetRectangle.top}
        x2={a_x2}
        y2={targetRectangle.top}
        stroke={"pink"}
        strokeWidth={2}
      />
      {/* Main curved path */}
      <path
        id={id}
        d={edgePath}
        stroke={"red"}
        strokeWidth={6}
        fill="none"
      />
      {/* Line from end of path to table (horizontal only) */}
      {/* <line
        x1={targetNode.position.x - 25}
        y1={targetY}
        x2={targetNode.position.x}
        y2={targetY}
        stroke={"lime"}
        strokeWidth={5}
      /> */}

      <line
        x1={b_x1}
        y1={sourceRectangle.top}
        x2={b_x2}
        y2={sourceRectangle.top}
        stroke={"red"}
        strokeWidth={2}
      />

      <circle cx={sourceRectangle.left} cy={sourceRectangle.top} r={5} fill="purple" />
      <circle cx={targetRectangle.left} cy={targetRectangle.top} r={5} fill="yellow" />

    </g>
  );
};

export default CustomEdge;