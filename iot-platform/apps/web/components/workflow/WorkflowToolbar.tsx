'use client';

import { useState } from 'react';

export interface WorkflowToolbarProps {
  name: string;
  isDirty: boolean;
  syncStatus: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
  validationErrors: string[];
  isSaving: boolean;
  isExecuting?: boolean;
  executionId?: string | null;
  isDebugPanelOpen?: boolean;
  debugMessagesCount?: number;
  workflowId?: string | null;
  onSave: () => void;
  onBack: () => void;
  onDeploy?: () => void;  // Save + enable workflow (deploy to production)
  onTestRun?: () => void;  // Open execution input modal (test run)
  onStop?: () => void;  // Stop current execution
  onExport?: () => void;
  onExecutionHistory?: () => void;  // New: open execution history modal
  onValidation?: () => void;
  onShowHelp?: () => void;
  onDebugToggle?: () => void;  // Toggle debug panel
}

export default function WorkflowToolbar({
  name,
  isDirty,
  syncStatus,
  validationErrors,
  isSaving,
  isExecuting,
  executionId,
  isDebugPanelOpen,
  debugMessagesCount,
  workflowId,
  onSave,
  onBack,
  onDeploy,
  onTestRun,
  onStop,
  onExport,
  onExecutionHistory,
  onValidation,
  onShowHelp,
  onDebugToggle,
}: WorkflowToolbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Back to workflows list"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Workflow name and status */}
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {name}
          </h1>
          {syncStatus === 'loading' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Loading...</p>
          )}
          {isDirty && syncStatus !== 'saving' && (
            <p className="text-xs text-orange-600 dark:text-orange-400">Unsaved changes</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Validation errors indicator */}
        {validationErrors.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-red-700 dark:text-red-300">
              {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Execution status badge */}
        {isExecuting && executionId && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
            <svg className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              Executing...
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">
              {executionId.slice(0, 8)}...
            </span>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving || validationErrors.length > 0}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-200
            ${
              isDirty && validationErrors.length === 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
          title="Save workflow (Ctrl+S)"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          ) : (
            'Save'
          )}
        </button>

        {/* Deploy button */}
        <button
          onClick={onDeploy}
          disabled={validationErrors.length > 0 || isExecuting}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
            ${
              validationErrors.length === 0 && !isExecuting
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
          title="Deploy workflow to production"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Deploy
        </button>

        {/* Test Run button */}
        <button
          onClick={onTestRun}
          disabled={!workflowId || isExecuting}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
            ${
              workflowId && !isExecuting
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
          title="Manually trigger workflow execution with input data"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Test Run
        </button>

        {/* Stop button — only when executing */}
        {isExecuting && (
          <button
            onClick={onStop}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            title="Stop current execution"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
            Stop
          </button>
        )}

        {/* Debug button */}
        <div className="relative">
          <button
            onClick={onDebugToggle}
            className={`
              px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
              ${
                isDebugPanelOpen
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }
            `}
            title="Toggle debug panel (show execution context)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Debug</span>
          </button>
          {/* Unread badge — show when messages exist and panel closed */}
          {(debugMessagesCount ?? 0) > 0 && !isDebugPanelOpen && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {debugMessagesCount}
            </span>
          )}
        </div>

        {/* Menu button (⋮) */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="More options"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 8c1.1 0 2-0.9 2-2s-0.9-2-2-2-2 0.9-2 2 0.9 2 2 2zm0 2c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2zm0 6c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2z" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10">
              <button
                onClick={() => {
                  onExport?.();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export JSON
              </button>

              <button
                onClick={() => {
                  onExecutionHistory?.();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Execution History
              </button>

              {validationErrors.length > 0 && (
                <button
                  onClick={() => {
                    onValidation?.();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Validation Errors ({validationErrors.length})
                </button>
              )}

              <button
                onClick={() => {
                  onShowHelp?.();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Help (?)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
