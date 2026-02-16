'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppSelector } from '@/lib/store';
import NodeErrorBadge from '../NodeErrorBadge';

/**
 * Condition Node Component
 *
 * Visual representation of condition nodes in the workflow canvas.
 * Conditions evaluate expressions and branch to different paths (true/false).
 */

export interface ConditionNodeData {
  label?: string;
  description?: string;
  config: Record<string, any>;
}

function ConditionNode({ data, selected, id }: NodeProps<ConditionNodeData>) {
  const { validationErrors } = useAppSelector(state => state.workflow);
  const hasError = validationErrors.some(error => error.includes(id));

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px]
        bg-orange-50 dark:bg-orange-900/20
        border-orange-500 dark:border-orange-400
        ${selected ? 'ring-2 ring-orange-500 ring-offset-2' : ''}
        ${hasError ? 'ring-2 ring-red-500 ring-offset-2' : ''}
        transition-all duration-200
      `}
    >
      {hasError && <NodeErrorBadge />}
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-orange-500 dark:!bg-orange-400 !border-2 !border-white dark:!border-gray-800"
      />

      {/* Icon */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-orange-500 dark:bg-orange-400 flex items-center justify-center">
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
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
        </div>
        <span className="font-semibold text-sm text-orange-900 dark:text-orange-100">
          Condition
        </span>
      </div>

      {/* Label */}
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {data.label || 'Untitled Condition'}
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {data.description}
        </div>
      )}

      {/* Output Handles (True/False branches) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '40%' }}
        className="w-3 h-3 !bg-green-500 dark:!bg-green-400 !border-2 !border-white dark:!border-gray-800"
      />
      <div
        className="absolute right-[-45px] top-[35%] text-xs font-medium text-green-600 dark:text-green-400"
      >
        ✓
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '60%' }}
        className="w-3 h-3 !bg-red-500 dark:!bg-red-400 !border-2 !border-white dark:!border-gray-800"
      />
      <div
        className="absolute right-[-45px] top-[55%] text-xs font-medium text-red-600 dark:text-red-400"
      >
        ✗
      </div>
    </div>
  );
}

export default memo(ConditionNode);
