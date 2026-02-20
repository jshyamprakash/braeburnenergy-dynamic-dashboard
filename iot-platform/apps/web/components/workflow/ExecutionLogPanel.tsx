'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/lib/store';

/**
 * ExecutionLogPanel
 *
 * Displays live workflow execution step-by-step log with status icons.
 * Auto-scrolls to latest entries. Shows execution summary at top.
 */
export default function ExecutionLogPanel() {
  const { executionLog, isStreaming, executionStatus, executionError, currentExecutionId } =
    useAppSelector(state => state.workflow);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current && isStreaming) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [executionLog, isStreaming]);

  // Status icon component
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'running':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" strokeWidth="2" className="opacity-75" fill="currentColor" />
          </svg>
        );
      case 'completed':
        return <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>;
      case 'failed':
        return <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>;
      default:
        return null;
    }
  };

  if (executionLog.length === 0 && !isStreaming) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>Run the workflow to see live execution logs.</p>
      </div>
    );
  }

  const totalDuration = executionLog.reduce((sum, log) => sum + (log.duration || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Summary Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Execution {currentExecutionId?.substring(0, 8) || 'N/A'}...
            </span>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              executionStatus === 'running'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                : executionStatus === 'completed'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
            }`}>
              {executionStatus.charAt(0).toUpperCase() + executionStatus.slice(1)}
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{totalDuration}ms</span>
        </div>
        {executionError && (
          <p className="text-xs text-red-600 dark:text-red-400">{executionError}</p>
        )}
      </div>

      {/* Log Entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {executionLog.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Waiting for execution...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {executionLog.map((log, idx) => (
              <div key={idx} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">
                    <StatusIcon status={log.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {log.nodeType?.replace(':', ' ').toUpperCase() || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {log.duration || 0}ms
                      </span>
                    </div>
                    {log.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{log.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
