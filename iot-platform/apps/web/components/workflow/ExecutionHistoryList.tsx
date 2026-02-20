'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { loadExecutionHistory, loadExecutionDetail } from '@/lib/store/slices/workflowSlice';

interface ExecutionHistoryListProps {
  onSelectExecution?: () => void;
}

/**
 * ExecutionHistoryList
 *
 * Displays paginated list of past workflow executions.
 * Click row to load full execution details into the log panel.
 */
export default function ExecutionHistoryList({ onSelectExecution }: ExecutionHistoryListProps) {
  const dispatch = useAppDispatch();
  const { workflowId, executionHistory, executionHistoryTotal, executionHistoryLoading } =
    useAppSelector(state => state.workflow);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Load history on component mount or when workflowId changes
  useEffect(() => {
    if (workflowId) {
      dispatch(loadExecutionHistory({ workflowId, limit, offset }));
    }
  }, [dispatch, workflowId, offset]);

  const handleRowClick = (executionId: string) => {
    dispatch(loadExecutionDetail(executionId));
    onSelectExecution?.();
  };

  const handlePrev = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNext = () => {
    if (offset + limit < executionHistoryTotal) {
      setOffset(offset + limit);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">Completed</span>;
      case 'failed':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">Failed</span>;
      case 'running':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">Running</span>;
      default:
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Pending</span>;
    }
  };

  if (executionHistory.length === 0 && !executionHistoryLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No executions yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Execution ID</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Trigger</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Duration</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {executionHistoryLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-12" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20" /></td>
                </tr>
              ))
            ) : (
              executionHistory.map((exec) => (
                <tr
                  key={exec.executionId}
                  onClick={() => handleRowClick(exec.executionId)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-3">{getStatusBadge(exec.status)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {exec.executionId?.substring(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {exec.trigger?.type || 'manual'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {exec.duration || 0}ms
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {new Date(exec.createdAt).toLocaleDateString()} {new Date(exec.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {Math.min(offset + 1, executionHistoryTotal)} - {Math.min(offset + limit, executionHistoryTotal)} of {executionHistoryTotal}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={offset === 0}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Prev
          </button>
          <button
            onClick={handleNext}
            disabled={offset + limit >= executionHistoryTotal}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
