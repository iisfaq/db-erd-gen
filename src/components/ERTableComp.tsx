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
import { Badge, Group } from '@mantine/core';

import { inputDataToNodeAndEdges } from '../utils/inputData/inputDataToNode';
import { Table, TablePosition } from '../interface/inputData';

import useTableStore from '../store/zustandStore';
import DownloadButton from './leftBar/components/DownloadButton';
import ReloadButton from './leftBar/components/ReloadButton';

interface ERTableProps {
  tableArray: Table[]
  updateTablePositions?: (tableName: string, position: TablePosition) => void
}

function ERTableComp({ tableArray, updateTablePositions }: ERTableProps) {

  const update = useTableStore((state) => state.update);

  const [nodes, setNodes] = useState<Node<any>[]>([]);
  const [edges, setEdges] = useState<Edge<any>[]>([]);

  useEffect(() => {
    const testData = inputDataToNodeAndEdges(tableArray);

    setNodes(testData.nodes);
    setEdges(testData.edges);

  }, [tableArray, update]);

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
        maxZoom={4}
      >
        <Background />
        <Controls />
        {/* <MiniMap  pannable zoomable/> */}

        <Panel position="top-right">
          <Group mt={8}>
            <Badge radius="sm" variant='light' color="green" tt="none">
              Table count: {nodes.length}
            </Badge>
            <pre style={{ maxWidth: 400, maxHeight: 200, overflow: "auto", fontSize: 10, background: "#fff", color: "#000" }}>
              {JSON.stringify(edges, null, 2)}
            </pre>
            <pre style={{ maxWidth: 400, maxHeight: 200, overflow: "auto", fontSize: 10, background: "#fff", color: "#000" }}>
              {JSON.stringify(nodes, null, 2)}
            </pre>
            {!!updateTablePositions && <DownloadButton />}
            <ReloadButton />
          </Group>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default ERTableComp
