'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppSelector } from '@/lib/store';
import NodeErrorBadge from '../NodeErrorBadge';
import StatusBadge from './StatusBadge';

/**
 * Switch Node Component
 *
 * Visual representation of switch nodes in the workflow canvas.
 * Switches route to different branches based on a value match.
 * Renders one source handle per case, plus a default fallback handle.
 */

interface CaseEntry {
  match: string;
  handle: string;
}

export interface SwitchNodeData {
  label?: string;
  description?: string;
  config: Record<string, any>;
  executionStatus?: 'idle' | 'running' | 'completed' | 'failed';
}

function SwitchNode({ data, selected, id }: NodeProps<SwitchNodeData>) {
  const { validationErrors } = useAppSelector(state => state.workflow);
  const hasError = validationErrors.some(error => error.includes(id));

  // Safely parse cases from config
  let cases: CaseEntry[] = [];
  if (data.config?.cases) {
    try {
      const parsed = typeof data.config.cases === 'string'
        ? JSON.parse(data.config.cases)
        : data.config.cases;
      cases = Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback to empty array on parse error
      cases = [];
    }
  }

  // Calculate handle positions
  const handleSpacing = 40; // pixels between handles
  const totalHeight = Math.max(80, 60 + cases.length * handleSpacing);
  const startY = 20;

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border-2 shadow-lg min-w-[160px]
        bg-violet-50 dark:bg-violet-900/20
        border-violet-500 dark:border-violet-400
        ${selected ? 'ring-2 ring-violet-500 ring-offset-2' : ''}
        ${hasError ? 'ring-2 ring-red-500 ring-offset-2' : ''}
        transition-all duration-200
      `}
      style={{ minHeight: `${totalHeight}px` }}
    >
      {hasError && <NodeErrorBadge />}
      <StatusBadge status={data.executionStatus} />

      {/* Input Handle — top centre */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ transform: 'translate(-50%, -20%)' }}
        className="!w-2.5 !h-2.5 !rounded-full !bg-violet-500 dark:!bg-violet-400 !border-2 !border-white dark:!border-gray-800"
      />

      {/* Label */}
      <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">
        {data.label || 'Switch'}
      </div>

      {/* Case handles — stacked vertically on the right */}
      {cases.map((caseEntry, index) => (
        <Handle
          key={`case-${index}`}
          type="source"
          position={Position.Right}
          id={caseEntry.handle}
          style={{
            top: `${startY + index * handleSpacing}px`,
            transform: 'translate(50%, -50%)',
          }}
          className="!w-2.5 !h-2.5 !rounded-full !bg-violet-500 dark:!bg-violet-400 !border-2 !border-white dark:!border-gray-800"
        />
      ))}

      {/* Default handle — at the bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        style={{ transform: 'translate(-50%, 20%)' }}
        className="!w-2.5 !h-2.5 !rounded-full !bg-violet-300 dark:!bg-violet-500 !border-2 !border-white dark:!border-gray-800"
      />

      {/* Case labels — small text next to each handle */}
      {cases.map((caseEntry, index) => (
        <div
          key={`label-${index}`}
          className="absolute text-xs text-gray-600 dark:text-gray-400 pointer-events-none"
          style={{
            right: -60,
            top: `${startY + index * handleSpacing - 8}px`,
            maxWidth: '50px',
            wordBreak: 'break-word',
          }}
        >
          {caseEntry.match}
        </div>
      ))}

      {/* Default label */}
      <div className="absolute text-xs text-gray-500 dark:text-gray-500 pointer-events-none bottom-1 left-1/2 -translate-x-1/2">
        default
      </div>
    </div>
  );
}

export default memo(SwitchNode);
