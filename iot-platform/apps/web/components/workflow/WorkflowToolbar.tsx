'use client';

import { ReactNode } from 'react';

export interface WorkflowToolbarProps {
  name: string;
  isDirty: boolean;
  syncStatus: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
  validationErrors: string[];
  isSaving: boolean;
  isExecuting?: boolean;
  executionId?: string | null;
  onSave: () => void;
  onBack: () => void;
  onRun?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  onValidation?: () => void;
}

export default function WorkflowToolbar({
  name,
  isDirty,
  syncStatus,
  validationErrors,
  isSaving,
  isExecuting,
  executionId,
  onSave,
  onBack,
  onRun,
  onExport,
  onSettings,
  onValidation,
}: WorkflowToolbarProps) {
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

        {/* Run button */}
        <button
          onClick={onRun}
          disabled={validationErrors.length > 0 || isExecuting}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
            ${
              validationErrors.length === 0 && !isExecuting
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
          title="Execute workflow (Ctrl+R)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Run
        </button>

        {/* Validation button */}
        {validationErrors.length > 0 && (
          <button
            onClick={onValidation}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors relative"
            title="Show validation errors (Ctrl+Shift+M)"
          >
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
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
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {validationErrors.length}
            </span>
          </button>
        )}

        {/* Export dropdown (placeholder) */}
        <button
          onClick={onExport}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Export workflow"
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving || validationErrors.length > 0}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-200
            ${
              isDirty && validationErrors.length === 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
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

        {/* Settings button */}
        <button
          onClick={onSettings}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Workflow settings"
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
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
