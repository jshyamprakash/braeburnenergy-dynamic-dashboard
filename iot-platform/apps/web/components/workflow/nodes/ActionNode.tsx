'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppSelector } from '@/lib/store';
import NodeErrorBadge from '../NodeErrorBadge';
import StatusBadge from './StatusBadge';

/**
 * Action Node Component
 *
 * Visual representation of action nodes in the workflow canvas.
 * Actions perform operations (send notification, update device, create alarm, etc.)
 */

export interface ActionNodeData {
  label?: string;
  description?: string;
  config: Record<string, any>;
  executionStatus?: 'idle' | 'running' | 'completed' | 'failed';
}

function ActionNode({ data, selected, id }: NodeProps<ActionNodeData>) {
  const { validationErrors } = useAppSelector(state => state.workflow);
  const hasError = validationErrors.some(error => error.includes(id));

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border-2 shadow-lg min-w-[160px]
        bg-blue-50 dark:bg-blue-900/20
        border-blue-500 dark:border-blue-400
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
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
        className="!w-2.5 !h-2.5 !rounded-none !bg-blue-500 dark:!bg-blue-400 !border-2 !border-white dark:!border-gray-800"
      />

      {/* Label only */}
      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
        {data.label || 'Untitled Action'}
      </div>

      {/* Output Handle — bottom centre, diamond */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ transform: 'translate(-50%, 20%) rotate(45deg)' }}
        className="!w-2.5 !h-2.5 !rounded-none !bg-blue-500 dark:!bg-blue-400 !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}

export default memo(ActionNode);
