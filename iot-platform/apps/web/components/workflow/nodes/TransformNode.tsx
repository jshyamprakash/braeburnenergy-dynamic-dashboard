'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppSelector } from '@/lib/store';
import NodeErrorBadge from '../NodeErrorBadge';

/**
 * Transform Node Component
 *
 * Visual representation of transformation nodes in the workflow canvas.
 * Transformations manipulate data (math operations, string operations, aggregation, etc.)
 */

export interface TransformNodeData {
  label?: string;
  description?: string;
  config: Record<string, any>;
}

function TransformNode({ data, selected, id }: NodeProps<TransformNodeData>) {
  const { validationErrors } = useAppSelector(state => state.workflow);
  const hasError = validationErrors.some(error => error.includes(id));

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px]
        bg-purple-50 dark:bg-purple-900/20
        border-purple-500 dark:border-purple-400
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
        ${hasError ? 'ring-2 ring-red-500 ring-offset-2' : ''}
        transition-all duration-200
      `}
    >
      {hasError && <NodeErrorBadge />}
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 dark:!bg-purple-400 !border-2 !border-white dark:!border-gray-800"
      />

      {/* Icon */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-purple-500 dark:bg-purple-400 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white dark:text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </div>
        <span className="font-semibold text-sm text-purple-900 dark:text-purple-100">
          Transform
        </span>
      </div>

      {/* Label */}
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {data.label || 'Untitled Transform'}
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {data.description}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 dark:!bg-purple-400 !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}

export default memo(TransformNode);
