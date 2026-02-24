'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export interface ExecutionInputModalProps {
  isOpen: boolean;
  isLoading: boolean;
  workflowId: string | null;
  nodes?: any[];
  onClose: () => void;
  onExecute: (inputData: Record<string, any>) => void;
}

export default function ExecutionInputModal({
  isOpen,
  isLoading,
  workflowId,
  nodes = [],
  onClose,
  onExecute,
}: ExecutionInputModalProps) {
  const [variables, setVariables] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' },
  ]);
  const [isFetchingState, setIsFetchingState] = useState(false);
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null);

  // Find deviceStateChange trigger node if present
  const triggerNode = nodes.find(n => n.type === 'trigger:deviceStateChange');
  const triggerDeviceId: string | null = triggerNode?.data?.config?.deviceId ?? null;
  const triggerField: string | null = triggerNode?.data?.config?.field ?? null;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setVariables([{ key: '', value: '' }]);
      setPrefillBanner(null);
    }
  }, [isOpen]);

  const handleAddVariable = () => {
    setVariables([...variables, { key: '', value: '' }]);
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleVariableChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...variables];
    updated[index][field] = val;
    setVariables(updated);
  };

  const handlePrefillFromLatestState = async () => {
    if (!triggerDeviceId) return;
    setIsFetchingState(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>(`/devices/${triggerDeviceId}/states/latest`);
      const state = res.data?.data;
      if (!state) {
        toast.error('No states found for this device yet');
        return;
      }

      const stateId = state._id ?? state.id;
      const fieldValue = triggerField ? state.data?.[triggerField] : undefined;

      const prefilled: Array<{ key: string; value: string }> = [
        { key: 'deviceId', value: triggerDeviceId },
        { key: 'stateId', value: String(stateId) },
        { key: 'field', value: triggerField ?? '' },
        { key: 'value', value: fieldValue != null ? String(fieldValue) : '' },
      ];

      setVariables(prefilled);
      setPrefillBanner(`Pre-filled from latest state (${new Date(state.timestamp).toLocaleTimeString()})`);
      toast.success('Form pre-filled from latest device state');
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch latest state');
    } finally {
      setIsFetchingState(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const inputData: Record<string, any> = {};
    for (const { key, value } of variables) {
      if (!key.trim()) continue;
      if (!value.trim()) {
        toast.error(`Variable "${key}" is empty`);
        return;
      }
      try {
        inputData[key] = JSON.parse(value);
      } catch {
        inputData[key] = value;
      }
    }

    onExecute(inputData);
    setVariables([{ key: '', value: '' }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Execute Workflow
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Provide input variables for workflow execution
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 max-h-96 overflow-y-auto">
          {/* Auto-fill banner for deviceStateChange workflows */}
          {triggerDeviceId && (
            <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3">
              <div>
                {prefillBanner ? (
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    ✓ {prefillBanner}
                  </p>
                ) : (
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>deviceStateChange</strong> trigger detected — load real context to test <code className="bg-purple-100 dark:bg-purple-800 px-1 rounded">writeDeviceState</code> nodes.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handlePrefillFromLatestState}
                disabled={isFetchingState}
                className="shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {isFetchingState ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Fetching...
                  </>
                ) : 'Load latest state'}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {variables.map((variable, index) => (
              <div key={index} className="flex gap-2 items-end">
                {/* Key input */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Variable Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., deviceId"
                    value={variable.key}
                    onChange={e => handleVariableChange(index, 'key', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Value input */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Value (JSON or string)
                  </label>
                  <input
                    type="text"
                    placeholder='e.g., "device-123" or {"id": 1}'
                    value={variable.value}
                    onChange={e => handleVariableChange(index, 'value', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Remove button */}
                {variables.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariable(index)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Remove variable"
                  >
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add variable button */}
          <button
            type="button"
            onClick={handleAddVariable}
            className="mt-4 w-full py-2 px-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            + Add Variable
          </button>

          {/* Help text */}
          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Values are parsed as JSON first, then as strings. For{' '}
              <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">writeDeviceState</code>{' '}
              nodes, include <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">deviceId</code>{' '}
              and <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">stateId</code> — or use{' '}
              <strong>Load latest state</strong> above.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || !workflowId}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
              ${
                isLoading || !workflowId
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            `}
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Executing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Execute
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
