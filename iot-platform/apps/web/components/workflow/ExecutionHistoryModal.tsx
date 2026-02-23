'use client';

import { useState } from 'react';
import ExecutionHistoryList from './ExecutionHistoryList';
import ExecutionLogPanel from './ExecutionLogPanel';

export interface ExecutionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ExecutionHistoryModal
 *
 * Modal dialog that displays workflow execution history and detailed logs.
 * Features:
 * - List of past executions (status, ID, trigger, duration)
 * - Click to expand and view execution step logs
 * - Execution details with node-by-node progress
 */
export default function ExecutionHistoryModal({ isOpen, onClose }: ExecutionHistoryModalProps) {
  const [showLogs, setShowLogs] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl h-[80vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Execution History
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View past workflow executions and detailed step logs
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content - Split View */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Execution List */}
          <div className="flex-1 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <ExecutionHistoryList
              onSelectExecution={() => {
                setShowLogs(true);
              }}
            />
          </div>

          {/* Right: Execution Details / Step Logs */}
          {showLogs && (
            <div className="w-1/3 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
              <ExecutionLogPanel />
            </div>
          )}

          {/* Empty State When No Logs Selected */}
          {!showLogs && (
            <div className="hidden lg:flex w-1/3 bg-gray-50 dark:bg-gray-900 items-center justify-center">
              <div className="text-center p-4">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Click an execution to view details
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
