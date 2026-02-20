'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppSelector } from '@/lib/store';
import NodeErrorBadge from '../NodeErrorBadge';
import StatusBadge from './StatusBadge';

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
  executionStatus?: 'idle' | 'running' | 'completed' | 'failed';
}

function TransformNode({ data, selected, id }: NodeProps<TransformNodeData>) {
  const { validationErrors } = useAppSelector(state => state.workflow);
  const hasError = validationErrors.some(error => error.includes(id));

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border-2 shadow-lg min-w-[160px]
        bg-purple-50 dark:bg-purple-900/20
        border-purple-500 dark:border-purple-400
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
        ${hasError ? 'ring-2 ring-red-500 ring-offset-2' : ''}
        transition-all duration-200
      `}
    >
      {hasError && <NodeErrorBadge />}
      <StatusBadge status={data.executionStatus} />
      {/* Input Handle — top centre, diamond */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ transform: 'translate(-50%, -20%) rotate(45deg)' }}
        className="!w-2.5 !h-2.5 !rounded-none !bg-purple-500 dark:!bg-purple-400 !border-2 !border-white dark:!border-gray-800"
      />

      {/* Label only */}
      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
        {data.label || 'Untitled Transform'}
      </div>

      {/* Output Handle — bottom centre, diamond */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ transform: 'translate(-50%, 20%) rotate(45deg)' }}
        className="!w-2.5 !h-2.5 !rounded-none !bg-purple-500 dark:!bg-purple-400 !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}

export default memo(TransformNode);
