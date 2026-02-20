'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  label?: string;
}

export function CodeBlock({ code, language = 'bash', label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      {/* Label bar */}
      {label && (
        <div className="flex items-center justify-between bg-gray-100 px-4 py-2 dark:bg-gray-800">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{language}</span>
        </div>
      )}

      {/* Code block */}
      <div className="relative">
        <pre className="overflow-x-auto p-4">
          <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
            {code}
          </code>
        </pre>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          className="absolute right-2 top-2 rounded bg-gray-200 p-2 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>
    </div>
  );
}
