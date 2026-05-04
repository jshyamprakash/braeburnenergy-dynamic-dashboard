'use client';

import { useState } from 'react';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyCreatedModalProps {
  keyValue: string;
  onClose: () => void;
}

export function ApiKeyCreatedModal({
  keyValue,
  onClose,
}: ApiKeyCreatedModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full shadow-xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            API Key Created
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Banner */}
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Save this key now
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                This is the only time your API key will be displayed. If you lose
                it, you'll need to rotate or create a new key.
              </p>
            </div>
          </div>

          {/* Key Display */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Your API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 font-mono text-sm break-all text-slate-900 dark:text-gray-100 overflow-x-auto">
                {keyValue}
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-200">
            <p>
              Use this key in API requests via the{' '}
              <code className="bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded font-mono">
                Authorization: Bearer
              </code>{' '}
              header.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-slate-900 dark:text-white rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
