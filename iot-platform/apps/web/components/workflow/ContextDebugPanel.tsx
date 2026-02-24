'use client';

import { useState } from 'react';
import type { WorkflowExecutionStepEvent, WorkflowDebugMessageEvent } from '@repo/types';

interface ContextDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  executionLog: WorkflowExecutionStepEvent[];
  executionStatus: 'idle' | 'running' | 'completed' | 'failed';
  nodes: any[];
  debugMessages?: WorkflowDebugMessageEvent[];
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
  debugMessages = [],
}: ContextDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'debug' | 'variables' | 'steps' | 'tester'>('debug');
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
        {['debug', 'steps', 'variables', 'tester'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 py-2 text-xs font-medium transition-colors relative ${
              activeTab === tab
                ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'debug' && debugMessages.length > 0 && (
              <span className="ml-1 px-1 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {debugMessages.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="h-[280px] overflow-y-auto">
        {executionLog.length === 0 && debugMessages.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            Run a workflow to see execution context
          </div>
        ) : activeTab === 'debug' ? (
          <div className="p-3 space-y-1 h-full">
            {debugMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No debug messages yet.</p>
                <p className="text-xs mt-1 text-gray-400">Add an <strong>action:debug</strong> node and connect it to see live output here.</p>
              </div>
            ) : (
              debugMessages.map((msg, idx) => (
                <div key={idx} className="font-mono text-xs border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                  <div className={`flex items-center gap-2 px-2 py-1 ${
                    msg.level === 'ERROR' ? 'bg-red-50 dark:bg-red-900/20' :
                    msg.level === 'WARN' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                    'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      msg.level === 'ERROR' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                      msg.level === 'WARN' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>{msg.level}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold truncate">{msg.nodeLabel}</span>
                  </div>
                  <div className="px-2 py-1.5 bg-white dark:bg-gray-900">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-all">{msg.message}</p>
                    {msg.rawData && Object.keys(msg.rawData).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 text-xs">raw data</summary>
                        <pre className="mt-1 text-gray-600 dark:text-gray-400 overflow-auto max-h-24 text-xs">
                          {JSON.stringify(msg.rawData, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
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
                        {step.notes && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                            log
                          </span>
                        )}
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
                    <div className="p-2 border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 max-h-[160px] overflow-y-auto">
                      {step.notes && (
                        <div className="mb-2 px-2 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs font-mono text-yellow-800 dark:text-yellow-300">
                          {step.notes}
                        </div>
                      )}
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
