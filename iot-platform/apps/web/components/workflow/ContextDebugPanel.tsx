'use client';

import { useState } from 'react';
import type { WorkflowExecutionStepEvent } from '@repo/types';

interface ContextDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  executionLog: WorkflowExecutionStepEvent[];
  executionStatus: 'idle' | 'running' | 'completed' | 'failed';
  nodes: any[];
}

/**
 * ContextDebugPanel - Bottom drawer showing execution context
 * Displays variables, node outputs, and expression tester
 */
export default function ContextDebugPanel({
  isOpen,
  onClose,
  executionLog,
  executionStatus,
  nodes,
}: ContextDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'variables' | 'steps' | 'tester'>('variables');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Extract variables from execution log (look for action:updateVariable nodes)
  const getVariables = () => {
    const vars: Record<string, any> = {};
    executionLog.forEach(step => {
      // Find variable assignments from step outputs
      if (step.output && typeof step.output === 'object') {
        // In real implementation, we'd parse context.variables from output
        Object.entries(step.output).forEach(([key, value]) => {
          if (key !== 'data' && key !== 'result') {
            vars[key] = value;
          }
        });
      }
    });
    return vars;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Execution Context</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {['variables', 'steps', 'tester'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="h-[280px] overflow-y-auto">
        {executionLog.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            Run a workflow to see execution context
          </div>
        ) : activeTab === 'variables' ? (
          <div className="p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Variables set during execution:</p>
            {Object.entries(getVariables()).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(getVariables()).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {key}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">No variables set</div>
            )}
          </div>
        ) : activeTab === 'steps' ? (
          <div className="p-4 space-y-2">
            {executionLog.map((step, idx) => {
              const node = nodes.find(n => n.id === step.nodeId);
              const isExpanded = selectedStepId === step.nodeId;
              return (
                <div key={idx} className="bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                  <button
                    onClick={() => setSelectedStepId(isExpanded ? null : step.nodeId)}
                    className="w-full p-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {node?.data?.label || step.nodeId}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            step.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {step.status}
                        </span>
                        <svg
                          className={`w-3 h-3 text-gray-600 dark:text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="p-2 border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 max-h-[120px] overflow-y-auto">
                      <div className="text-xs">
                        {step.output ? (
                          <pre className="font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-gray-500">No output</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Test expression against context:</p>
            <input
              type="text"
              placeholder="e.g., {{trigger.temperature}}"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
              Expression tester will resolve here
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
