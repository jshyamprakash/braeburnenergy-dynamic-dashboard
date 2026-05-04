'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { WorkflowExecutionStepEvent, WorkflowDebugMessageEvent } from '@repo/types';
import { apiClient } from '@/lib/api-client';

interface ContextDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClearDebug?: () => void;
  executionLog: WorkflowExecutionStepEvent[];
  executionStatus: 'idle' | 'running' | 'completed' | 'failed';
  nodes: any[];
  debugMessages?: WorkflowDebugMessageEvent[];
  workflowId?: string | null;
  executionId?: string | null;
}

/**
 * ContextDebugPanel - Bottom drawer showing execution context
 * Displays variables, node outputs, and expression tester
 */
export default function ContextDebugPanel({
  isOpen,
  onClose,
  onClearDebug,
  executionLog,
  executionStatus,
  nodes,
  debugMessages = [],
  workflowId,
  executionId,
}: ContextDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'debug' | 'variables' | 'steps' | 'tester'>('debug');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [testerInput, setTesterInput] = useState('{{trigger}}');
  const [testerResult, setTesterResult] = useState<any>(null);
  const [testerError, setTesterError] = useState<string | null>(null);
  const [testerLoading, setTesterLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Extract variables from execution context snapshot
  const getContextVariables = () => {
    if (executionLog.length === 0) {
      return { variables: {}, workspace: {}, trigger: {} };
    }

    // Use the last step's context snapshot (post-execution state)
    const lastStep = executionLog[executionLog.length - 1];
    if (lastStep.contextSnapshot) {
      return {
        variables: lastStep.contextSnapshot.variables || {},
        workspace: lastStep.contextSnapshot.workspace || {},
        trigger: lastStep.contextSnapshot.trigger || {},
      };
    }

    return { variables: {}, workspace: {}, trigger: {} };
  };

  // Evaluate expression against last execution context
  const evaluateExpression = useCallback(
    async (expression: string) => {
      if (!expression || !workflowId || executionLog.length === 0) {
        setTesterResult(null);
        setTesterError(null);
        return;
      }

      setTesterLoading(true);
      setTesterError(null);
      setTesterResult(null);

      try {
        const response = await apiClient.post<any>(`/workflows/${workflowId}/evaluate-expression`, {
          expression,
        });

        if (response.data && (response.data as any).data?.result !== undefined) {
          setTesterResult((response.data as any).data.result);
        } else {
          setTesterError('No result returned');
        }
      } catch (err: any) {
        setTesterError(err.message || 'Error evaluating expression');
      } finally {
        setTesterLoading(false);
      }
    },
    [workflowId, executionLog.length]
  );

  // Debounced expression evaluation
  const handleTesterInputChange = useCallback(
    (value: string) => {
      setTesterInput(value);

      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new debounced call (500ms delay)
      debounceTimer.current = setTimeout(() => {
        evaluateExpression(value);
      }, 500);
    },
    [evaluateExpression]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Export execution log as JSON
  const handleExportLog = () => {
    const logData = {
      workflowId: workflowId || 'unknown',
      executionId: executionId || 'unknown',
      executionLog,
      debugMessages,
      exportedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `execution-log-${executionId || 'latest'}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Execution Context</h3>
        <div className="flex items-center gap-2">
          {executionLog.length > 0 && (
            <button
              onClick={handleExportLog}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Download execution log as JSON"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Log
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-1">
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
                <span className="ml-1 px-1 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {debugMessages.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Clear button — only on Debug tab with messages */}
        {activeTab === 'debug' && debugMessages.length > 0 && onClearDebug && (
          <button
            onClick={onClearDebug}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Clear console"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        )}
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
              [...debugMessages].reverse().map((msg, idx) => (
                <div key={idx} className="font-mono text-xs border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                  <div className={`flex items-center gap-2 px-2 py-1 ${
                    msg.level === 'ERROR' ? 'bg-red-50 dark:bg-red-900/20' :
                    msg.level === 'WARN' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                    'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      msg.level === 'ERROR' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                      msg.level === 'WARN' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
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
          <div className="p-4 space-y-4 max-h-[280px] overflow-y-auto">
            {executionLog.length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">Run a workflow to see execution context</div>
            ) : (
              <>
                {/* User Variables */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">Variables</h4>
                  {Object.entries(getContextVariables().variables).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(getContextVariables().variables).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2 p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded text-xs">
                          <div className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 flex-shrink-0">{key}</div>
                          <div className="text-indigo-600 dark:text-indigo-400 truncate flex-1">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">No variables</div>
                  )}
                </div>

                {/* Trigger Data */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">Trigger</h4>
                  {Object.entries(getContextVariables().trigger).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(getContextVariables().trigger).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2 p-1.5 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                          <div className="font-mono font-semibold text-green-700 dark:text-green-300 flex-shrink-0">{key}</div>
                          <div className="text-green-600 dark:text-green-400 truncate flex-1">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">No trigger data</div>
                  )}
                </div>

                {/* Workspace */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">Workspace</h4>
                  {Object.entries(getContextVariables().workspace).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(getContextVariables().workspace).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2 p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded text-xs">
                          <div className="font-mono font-semibold text-amber-700 dark:text-amber-300 flex-shrink-0">{key}</div>
                          <div className="text-amber-600 dark:text-amber-400 truncate flex-1">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">No workspace data</div>
                  )}
                </div>
              </>
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
                      {step.status === 'failed' && (step as any).error && (
                        <div className="mb-2 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs font-mono text-red-800 dark:text-red-300 break-all">
                          <span className="font-bold">Error: </span>{(step as any).error}
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
          <div className="p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Expression:</p>
              <input
                type="text"
                value={testerInput}
                onChange={(e) => handleTesterInputChange(e.target.value)}
                placeholder="e.g., {{trigger.temperature}}"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                disabled={executionLog.length === 0}
              />
            </div>

            {/* Result or Error */}
            {testerLoading && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded text-xs text-indigo-600 dark:text-indigo-400">
                <div className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full" />
                Evaluating...
              </div>
            )}

            {testerError && !testerLoading && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Error</p>
                <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">{testerError}</p>
              </div>
            )}

            {testerResult !== null && !testerLoading && !testerError && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Result</p>
                <p className="text-xs text-green-600 dark:text-green-400 font-mono break-all">
                  {typeof testerResult === 'object' ? JSON.stringify(testerResult, null, 2) : String(testerResult)}
                </p>
              </div>
            )}

            {executionLog.length === 0 && (
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                Run a workflow to use the expression tester
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
