import { useStore } from 'reactflow';
import React, { SVGAttributes } from "react";
import { EdgeProps } from "reactflow";

// Implementation of getStraightPath

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  // sourceX,
  sourceY,
  // targetX,
  targetY,
  // markerEnd,
  selected,
  labelStyle,
  style,

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
  const edge = useStore(s => s.edges.find(e => e.id === id));
  const sourceNode = useStore(s => s.nodeInternals.get(source)) as unknown as Node;
  const targetNode = useStore(s => s.nodeInternals.get(target)) as unknown as Node;
  const sourceRectangle = createRectangle(sourceNode, sourceY);
  const targetRectangle = createRectangle(targetNode, targetY);

  var sourceOnLeft = sourceNode.position.x < targetNode.position.x;
  var targetOnLeft = sourceNode.position.x >= targetNode.position.x;

  var filler = 10;
  var a_x1 = targetRectangle.GetX(sourceOnLeft);
  var a_x2 = targetRectangle.GetX(sourceOnLeft) + (sourceOnLeft ? -filler : filler)

  var b_x1 = sourceRectangle.GetX(targetOnLeft);
  var b_x2 = sourceRectangle.GetX(targetOnLeft) + (targetOnLeft ? -filler : filler)

  function getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  }: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
  }): [string, [number, number], [number, number]] {
    // Returns an SVG path string for a straight line and the start/end points
    const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
    return [path, [sourceX, sourceY], [targetX, targetY]];
  }

  var edgePath;

  var color = selected ? "lime" : "white";


  switch (edge?.key) {
    case "one-to-one":
      edgePath = `M ${b_x1},${sourceRectangle.top} L ${b_x2},${sourceRectangle.top} L ${a_x2},${targetRectangle.top} L ${a_x1},${targetRectangle.top}`;
      return (<g>
        {/* Line from table to start of path (horizontal only) */}
        <path
          id={id}
          d={edgePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
        <circle cx={a_x1} cy={targetRectangle.top} r={5} fill={color} />
        <circle cx={b_x1} cy={sourceRectangle.top} r={5} fill={color} />

      </g>);
    case "one-to-many":
      edgePath = `M ${b_x1},${sourceRectangle.top} L ${b_x2},${sourceRectangle.top} L ${a_x2},${targetRectangle.top} L ${a_x1},${targetRectangle.top}`;
      return (<g>
        {/* Line from table to start of path (horizontal only) */}
        <path
          id={id}
          d={edgePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
        <circle cx={a_x1} cy={targetRectangle.top} r={5} fill={color} />
        <circle cx={b_x1} cy={sourceRectangle.top} r={5} fill={color} />

      </g>);
    case "many-to-one":
      edgePath = `M ${b_x1},${sourceRectangle.top} L ${b_x2},${sourceRectangle.top} L ${a_x2},${targetRectangle.top} L ${a_x1},${targetRectangle.top}`;
      return (<g>
        {/* Line from table to start of path (horizontal only) */}
        <path
          id={id}
          d={edgePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
        <circle cx={a_x1} cy={targetRectangle.top} r={5} fill={color} />
        <circle cx={b_x1} cy={sourceRectangle.top} r={5} fill={color} />

      </g>);
    case "many-to-many":
      edgePath = `M ${b_x1},${sourceRectangle.top} L ${b_x2},${sourceRectangle.top} L ${a_x2},${targetRectangle.top} L ${a_x1},${targetRectangle.top}`;
      return (<g>
        {/* Line from table to start of path (horizontal only) */}
        <path
          id={id}
          d={edgePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
        <circle cx={a_x1} cy={targetRectangle.top} r={5} fill={color} />
        <circle cx={b_x1} cy={sourceRectangle.top} r={5} fill={color} />

      </g>);
    default:
      edgePath = `M ${b_x1},${sourceRectangle.top} L ${b_x2},${sourceRectangle.top} L ${a_x2},${targetRectangle.top} L ${a_x1},${targetRectangle.top}`;
      return (<g>
        {/* Line from table to start of path (horizontal only) */}
        <path
          id={id}
          d={edgePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
        <circle cx={a_x1} cy={targetRectangle.top} r={5} fill={color} />
        <circle cx={b_x1} cy={sourceRectangle.top} r={5} fill={color} />

      </g>);
  }
};

export default CustomEdge;
