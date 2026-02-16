'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useAppDispatch, useAppSelector } from '@/lib/store';
import { setNodes, setEdges, addEdge as addWorkflowEdge, selectNode } from '@/lib/store/slices/workflowSlice';

// Custom node components
import TriggerNode from './nodes/TriggerNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import TransformNode from './nodes/TransformNode';

/**
 * Workflow Canvas Component
 *
 * Main React Flow canvas for visual workflow editing.
 * Supports drag-and-drop, node connection, and real-time updates.
 */

export default function WorkflowCanvas() {
  const dispatch = useAppDispatch();
  const { nodes: storeNodes, edges: storeEdges } = useAppSelector(state => state.workflow);

  // Local React Flow state (synced with Redux)
  const [localNodes, setLocalNodes, onNodesChange] = useNodesState(storeNodes);
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Custom node types mapping
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      condition: ConditionNode,
      action: ActionNode,
      transform: TransformNode,
    }),
    []
  );

  // Sync local nodes to Redux
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Sync to Redux after a short delay to avoid excessive updates
      setTimeout(() => {
        dispatch(setNodes(localNodes));
      }, 100);
    },
    [dispatch, localNodes, onNodesChange]
  );

  // Sync local edges to Redux
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      setTimeout(() => {
        dispatch(setEdges(localEdges));
      }, 100);
    },
    [dispatch, localEdges, onEdgesChange]
  );

  // Handle new connection
  const handleConnect = useCallback(
    (connection: Connection) => {
      dispatch(addWorkflowEdge(connection));
      setLocalEdges(eds => addEdge(connection, eds));
    },
    [dispatch, setLocalEdges]
  );

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      dispatch(selectNode(node.id));
    },
    [dispatch]
  );

  // Handle canvas click (deselect)
  const handlePaneClick = useCallback(() => {
    dispatch(selectNode(null));
  }, [dispatch]);

  // Sync store nodes/edges to local state when they change
  useMemo(() => {
    setLocalNodes(storeNodes);
  }, [storeNodes, setLocalNodes]);

  useMemo(() => {
    setLocalEdges(storeEdges);
  }, [storeEdges, setLocalEdges]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50 dark:bg-gray-900"
      >
        {/* Background pattern */}
        <Background
          gap={16}
          size={1}
          color="#94a3b8"
          className="dark:opacity-30"
        />

        {/* Navigation controls */}
        <Controls
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        />

        {/* Minimap */}
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger':
                return '#10b981'; // green-500
              case 'condition':
                return '#f97316'; // orange-500
              case 'action':
                return '#3b82f6'; // blue-500
              case 'transform':
                return '#a855f7'; // purple-500
              default:
                return '#6b7280'; // gray-500
            }
          }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        />
      </ReactFlow>
    </div>
  );
}
