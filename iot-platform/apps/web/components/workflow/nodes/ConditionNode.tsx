'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppSelector } from '@/lib/store';
import NodeErrorBadge from '../NodeErrorBadge';
import StatusBadge from './StatusBadge';

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
  executionStatus?: 'idle' | 'running' | 'completed' | 'failed';
}

function ConditionNode({ data, selected, id }: NodeProps<ConditionNodeData>) {
  const { validationErrors } = useAppSelector(state => state.workflow);
  const hasError = validationErrors.some(error => error.includes(id));

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border-2 shadow-lg min-w-[160px]
        bg-orange-50 dark:bg-orange-900/20
        border-orange-500 dark:border-orange-400
        ${selected ? 'ring-2 ring-orange-500 ring-offset-2' : ''}
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
        className="!w-2.5 !h-2.5 !rounded-none !bg-orange-500 dark:!bg-orange-400 !border-2 !border-white dark:!border-gray-800"
      />

      {/* Label only */}
      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
        {data.label || 'Untitled Condition'}
      </div>

      {/* True branch — bottom-left, diamond */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%', transform: 'translate(-50%, 20%) rotate(45deg)' }}
        className="!w-2.5 !h-2.5 !rounded-none !bg-green-500 dark:!bg-green-400 !border-2 !border-white dark:!border-gray-800"
      />
      

      {/* False branch — bottom-right, diamond */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%', transform: 'translate(-50%, 20%) rotate(45deg)' }}
        className="!w-2.5 !h-2.5 !rounded-none !bg-red-500 dark:!bg-red-400 !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}

export default memo(ConditionNode);
