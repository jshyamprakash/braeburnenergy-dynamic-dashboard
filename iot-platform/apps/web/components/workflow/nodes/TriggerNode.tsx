'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppSelector } from '@/lib/store';
import NodeErrorBadge from '../NodeErrorBadge';

/**
 * Trigger Node Component
 *
 * Visual representation of trigger nodes in the workflow canvas.
 * Triggers are entry points for workflow execution (manual, scheduled, device state change, etc.)
 */

export interface TriggerNodeData {
  label?: string;
  description?: string;
  config: Record<string, any>;
}

function TriggerNode({ data, selected, id }: NodeProps<TriggerNodeData>) {
  const { validationErrors } = useAppSelector(state => state.workflow);
  const hasError = validationErrors.some(error => error.includes(id));
  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px]
        bg-green-50 dark:bg-green-900/20
        border-green-500 dark:border-green-400
        ${selected ? 'ring-2 ring-green-500 ring-offset-2' : ''}
        ${hasError ? 'ring-2 ring-red-500 ring-offset-2' : ''}
        transition-all duration-200
      `}
    >
      {hasError && <NodeErrorBadge />}
      {/* Icon */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-green-500 dark:bg-green-400 flex items-center justify-center">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <span className="font-semibold text-sm text-green-900 dark:text-green-100">
          Trigger
        </span>
      </div>

      {/* Label */}
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {data.label || 'Untitled Trigger'}
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
        className="w-3 h-3 !bg-green-500 dark:!bg-green-400 !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}

export default memo(TriggerNode);
