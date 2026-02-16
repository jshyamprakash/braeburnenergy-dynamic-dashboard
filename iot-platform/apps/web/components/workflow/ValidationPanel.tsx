'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { selectNode } from '@/lib/store/slices/workflowSlice';
import { useReactFlow } from 'reactflow';

export interface ValidationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Validation Panel
 *
 * Displays workflow validation errors with click-to-navigate functionality.
 * Each error is clickable and zooms to the problematic node on the canvas.
 */
export default function ValidationPanel({ isOpen, onToggle }: ValidationPanelProps) {
  const dispatch = useAppDispatch();
  const { validationErrors, nodes } = useAppSelector(state => state.workflow);
  const { fitView, setCenter } = useReactFlow();

  // Parse error string to extract node ID
  // Format: "Orphaned node: node-abc123" or "Cycle detected: node-1 → node-2"
  const extractNodeIds = (error: string): string[] => {
    const nodeIds: string[] = [];
    const nodePattern = /node-[\w-]+/g;
    const matches = error.match(nodePattern);
    if (matches) {
      nodeIds.push(...matches);
    }
    return nodeIds;
  };

  // Handle error click: navigate to node
  const handleErrorClick = useCallback(
    (error: string) => {
      const nodeIds = extractNodeIds(error);
      if (nodeIds.length > 0) {
        const firstNodeId = nodeIds[0];
        const node = nodes.find(n => n.id === firstNodeId);

        if (node) {
          // Select node in Redux
          dispatch(selectNode(firstNodeId));

          // Zoom to node on canvas
          if (node.position) {
            setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1, duration: 300 });
          } else {
            fitView({ nodes: [node], duration: 300, padding: 0.3 });
          }
        }
      }
    },
    [dispatch, nodes, setCenter, fitView]
  );

  if (validationErrors.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-out z-40
        ${isOpen ? 'translate-y-0 shadow-xl' : 'translate-y-full'}
      `}
      style={{ maxHeight: '40vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Validation Errors
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
            {validationErrors.length}
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={onToggle}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Close validation panel"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Error List */}
      <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(40vh - 56px)' }}>
        <div className="space-y-2">
          {validationErrors.map((error, index) => (
            <button
              key={index}
              onClick={() => handleErrorClick(error)}
              className="w-full text-left p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
              title="Click to navigate to problematic node"
            >
              <div className="flex items-start gap-2">
                {/* Error type icon */}
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>

                {/* Error message */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 break-words">
                    {error}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Click to navigate
                  </p>
                </div>

                {/* Navigate arrow */}
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Help text */}
      <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/10 border-t border-gray-200 dark:border-gray-700 text-xs text-blue-700 dark:text-blue-300">
        💡 Click any error to navigate to the problematic node
      </div>
    </div>
  );
}
