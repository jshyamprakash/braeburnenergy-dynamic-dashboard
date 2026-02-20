'use client';

import { useState } from 'react';
import ExecutionLogPanel from './ExecutionLogPanel';
import ExecutionHistoryList from './ExecutionHistoryList';

interface ExecutionPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  workflowId: string | null;
}

/**
 * ExecutionPanel
 *
 * Collapsible bottom panel with "Live Log" and "History" tabs.
 * Displays ExecutionLogPanel or ExecutionHistoryList based on active tab.
 */
export default function ExecutionPanel({ isOpen, onToggle, workflowId }: ExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-out z-40
        ${isOpen ? 'translate-y-0 shadow-xl' : 'translate-y-full'}
      `}
      style={{ height: isOpen ? '280px' : '0px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">Execution Viewer</h3>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Toggle execution panel"
        >
          <svg
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
        <button
          onClick={() => setActiveTab('log')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'log'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-[1px]'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Live Log
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-[1px]'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'log' ? (
          <ExecutionLogPanel />
        ) : (
          <ExecutionHistoryList onSelectExecution={() => setActiveTab('log')} />
        )}
      </div>
    </div>
  );
}
