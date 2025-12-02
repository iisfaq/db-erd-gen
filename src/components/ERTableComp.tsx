import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Panel,
  Node,
  Edge,
} from 'reactflow';
import DataTableNode from './node/DataTableNode';
import CustomEdge from './CustomEdge';
import { Badge, Group, Slider } from '@mantine/core';

import { inputDataToNodeAndEdges } from '../utils/inputData/inputDataToNode';
import { Table, TablePosition } from '../interface/inputData';

import useTableStore from '../store/zustandStore';
import DownloadButton from './leftBar/components/DownloadButton';
import ReloadButton from './leftBar/components/ReloadButton';
import { runLeiden, routeEdges, layoutClusters, layoutNodes } from './layout/leiden';

interface ERTableProps {
  tableArray: Table[]
  updateTablePositions?: (tableName: string, position: TablePosition) => void
}

function ERTableComp({ tableArray, updateTablePositions }: ERTableProps) {

  const update = useTableStore((state) => state.update);

  const [nodes, setNodes] = useState<Node<any>[]>([]);
  const [edges, setEdges] = useState<Edge<any>[]>([]);
  const [sliderValue, setSliderValue] = useState(350);


  function intelligentPlacement(nodesAndEdges: { nodes: Node[]; edges: Edge[]; }) {
    // 1) detect communities using Leiden
    const communities = runLeiden(nodesAndEdges);

    // 2) place each cluster in 2D space
    const clusterCount = new Set(Object.values(communities)).size;
    const clusterPositions = layoutClusters(clusterCount, 700);

    // 3) place tables inside their cluster
    const nodePositions = layoutNodes(nodesAndEdges, communities, clusterPositions, {
      algorithm: "grid",         // ← change this
      spacing: sliderValue
    });

    // 4) compute edges w/ routing
    const routedEdges = routeEdges(nodesAndEdges, nodePositions, {
      algorithm: "curved"        // ← change this
    });

    nodesAndEdges.nodes.forEach((n) => {
      const pos = nodePositions[n.id];
      if (pos) n.position = pos;
    });
    nodesAndEdges.edges = routedEdges;
    console.log("Positioned Nodes and Edges:", nodesAndEdges);


    return nodesAndEdges; // Placeholder for actual intelligent placement logic  
  }


  useEffect(() => {
    const nodesAndEdgesWithoutPlacement = inputDataToNodeAndEdges(tableArray);
    const nodesAndEdgesWithPlacement = intelligentPlacement(nodesAndEdgesWithoutPlacement);
    setNodes(nodesAndEdgesWithPlacement.nodes);
    setEdges(nodesAndEdgesWithPlacement.edges);

  }, [tableArray, sliderValue]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds))
    }, []
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node,) => {
      !!updateTablePositions && updateTablePositions(node.data.name, node.position);
    }, []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges, tableArray]
  );

  const nodeTypes = useMemo(() => ({ textUpdater: DataTableNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  return (
    <div style={{ height: '100%', width: "100%", marginTop: "5vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        edgesUpdatable={true}
        minZoom={0.01}
        maxZoom={10}
      >``
        <Background />
        <Controls />
        {/* <MiniMap  pannable zoomable/> */}

        <Panel position="top-right">
          <Group mt={8}>
            <Slider
              value={sliderValue}
              onChange={setSliderValue}
              min={0}
              max={1500}
              step={1}
              label={String(sliderValue)}
              style={{ width: 150 }}
            />
            <Badge radius="sm" variant='light' color="green" tt="none">
              Table count: {nodes.length}
            </Badge>
            {/* Debug Info 
            <pre style={{ maxWidth: 400, maxHeight: 200, overflow: "auto", fontSize: 10, background: "#fff", color: "#000" }}>
              {JSON.stringify(edges, null, 2)}
            </pre>
            <pre style={{ maxWidth: 400, maxHeight: 200, overflow: "auto", fontSize: 10, background: "#fff", color: "#000" }}>
              {JSON.stringify(nodes, null, 2)}
            </pre>
            */}
            <div style={{ minWidth: 60, textAlign: "center" }}>Value: {sliderValue}</div>
            {!!updateTablePositions && <DownloadButton />}
            <ReloadButton />
          </Group>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default ERTableComp
