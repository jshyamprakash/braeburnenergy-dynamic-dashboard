'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { openExecutionModal } from '@/lib/store/slices/workflowSlice';
import NodeErrorBadge from '../NodeErrorBadge';
import StatusBadge from './StatusBadge';

/**
 * Trigger Node Component
 *
 * Visual representation of trigger nodes in the workflow canvas.
 * Triggers are entry points for workflow execution (manual, scheduled, device state change, etc.)
 */

export interface TriggerNodeData {
  label?: string;
  description?: string;
  nodeType?: string;
  config: Record<string, any>;
  executionStatus?: 'idle' | 'running' | 'completed' | 'failed';
}

function TriggerNode({ data, selected, id }: NodeProps<TriggerNodeData>) {
  const dispatch = useAppDispatch();
  const { validationErrors, workflowId, executionStatus } = useAppSelector(state => state.workflow);
  const hasError = validationErrors.some(error => error.includes(id));
  const isManual = data.nodeType === 'trigger:manual';

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border-2 shadow-lg min-w-[160px]
        bg-green-50 dark:bg-green-900/20
        border-green-500 dark:border-green-400
        ${selected ? 'ring-2 ring-green-500 ring-offset-2' : ''}
        ${hasError ? 'ring-2 ring-red-500 ring-offset-2' : ''}
        transition-all duration-200
      `}
    >
      {hasError && <NodeErrorBadge />}
      <StatusBadge status={data.executionStatus} />

      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
        {data.label || 'Untitled Trigger'}
      </div>

      {/* Run button — only for trigger:manual */}
      {isManual && (
        <button
          onClick={e => {
            e.stopPropagation();
            if (workflowId) dispatch(openExecutionModal(id));
          }}
          disabled={!workflowId || executionStatus === 'running'}
          title={!workflowId ? 'Save workflow first' : 'Run workflow'}
          className="nodrag mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          ▶ Run
        </button>
      )}

      {/* Output Handle — bottom centre, diamond */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ transform: 'translate(-50%, 20%) rotate(45deg)' }}
        className="!w-2.5 !h-2.5 !rounded-none !bg-green-500 dark:!bg-green-400 !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}

export default memo(TriggerNode);
