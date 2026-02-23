'use client';

import { useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
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

// Module-level constant — same object reference across ALL renders and StrictMode remounts.
// Defining inside the component (even with useMemo) creates a new reference on each mount,
// which triggers React Flow error #002 and causes createNodeInternals to crash.
const NODE_TYPES: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  transform: TransformNode,
};

interface WorkflowCanvasProps {
  onNodeContextMenu?: (event: React.MouseEvent, node: any) => void;
}

/**
 * Workflow Canvas Component
 *
 * Main React Flow canvas for visual workflow editing.
 * Supports drag-and-drop, node connection, and real-time updates.
 */

export default function WorkflowCanvas({ onNodeContextMenu }: WorkflowCanvasProps) {
  const dispatch = useAppDispatch();
  const { nodes: storeNodes, edges: storeEdges } = useAppSelector(state => state.workflow);
  const { fitView } = useReactFlow();

  // Local React Flow state (synced with Redux).
  // useNodesState initializes once at mount with the current Redux snapshot.
  // That snapshot can contain stale nodes from a previous session (resetWorkflow() runs
  // in an effect, AFTER the first render). Spreading to fresh objects + filtering out
  // any id-less nodes prevents React from emitting a "unique key" warning on that first render.
  const [localNodes, setLocalNodes, onNodesChange] = useNodesState(
    storeNodes.filter(n => !!n.id).map(n => ({
      ...n,
      position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
    }))
  );
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Track previous node count to detect first node added (for auto-fitView)
  const prevNodeCountRef = useRef(storeNodes.length);

  // Ref to always hold the latest localNodes for drag stop (avoids stale closure)
  const localNodesRef = useRef(localNodes);
  localNodesRef.current = localNodes;

  // Sync local nodes to Redux - skip during drag to prevent stutter
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Don't dispatch position changes to Redux during drag - onNodeDragStop handles that
    },
    [onNodesChange]
  );

  // Sync node positions to Redux only when drag completes (eliminates drag stutter)
  // Use localNodesRef (all nodes) instead of the nodes param (may only contain dragged nodes)
  // This prevents multi-selected nodes from disappearing when one node is clicked
  const handleNodeDragStop = useCallback(
    () => {
      dispatch(setNodes(localNodesRef.current));
    },
    [dispatch]
  );

  // Sync local edges to Redux (edge removes via keyboard delete)
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      const removals = changes.filter((c: any) => c.type === 'remove');
      if (removals.length > 0) {
        const removedIds = new Set(removals.map((c: any) => c.id));
        dispatch(setEdges(storeEdges.filter((e: any) => !removedIds.has(e.id))));
      }
    },
    [dispatch, storeEdges, onEdgesChange]
  );

  // Handle new connection — dispatch to Redux only; useEffect syncs to localEdges
  const handleConnect = useCallback(
    (connection: Connection) => {
      dispatch(addWorkflowEdge(connection));
    },
    [dispatch]
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

  // Handle node context menu
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      onNodeContextMenu?.(event, node);
    },
    [onNodeContextMenu]
  );

  // Sync store nodes/edges to local React Flow state when Redux changes
  // useEffect (not useMemo) is correct here — this is a side effect, not a computation
  useEffect(() => {
    const prevCount = prevNodeCountRef.current;
    prevNodeCountRef.current = storeNodes.length;
    // Build fresh (unfrozen) node objects, deduplicated by id.
    //
    // WHY: Immer deeply freezes Redux state. Passing frozen objects to React Flow's
    // createNodeInternals causes "Cannot read properties of undefined (reading 'x')"
    // during page-navigation remounts (e.g. template load /workflows → /workflows/new).
    //
    // WHY DEDUP: On initial WorkflowCanvas mount the React Flow store may briefly hold
    // stale nodes from a previous session (before resetWorkflow() effect fires). When
    // template nodes then arrive via setNodes(), duplicated ids produce the React warning
    // "Each child in a list should have a unique key prop" in NodeRenderer.
    // Using a Map guarantees each id appears exactly once and keeps the latest value.
    const seen = new Map<string, any>();
    storeNodes.forEach(n => {
      if (n.id) {
        seen.set(n.id, {
          ...n,
          position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
        });
      }
    });
    setLocalNodes(Array.from(seen.values()));

    // When first node is added to an empty canvas, fit view so it's visible.
    // Uses setTimeout so React Flow has time to measure the new node's dimensions.
    // Cleanup cancels the timer (handles StrictMode double-invocation and fast navigation).
    if (prevCount !== 0 || storeNodes.length === 0) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        fitView({ duration: 300, padding: 0.3 });
      } catch {
        // fitView may fail if component unmounted before timer fires
      }
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [storeNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocalEdges(storeEdges);
  }, [storeEdges]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={handleContextMenu}
        nodeTypes={NODE_TYPES}
        deleteKeyCode={['Backspace', 'Delete']}
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
