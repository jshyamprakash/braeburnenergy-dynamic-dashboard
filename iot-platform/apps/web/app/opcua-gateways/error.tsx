'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('OPC-UA Gateways page error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || 'Failed to load OPC-UA gateways'}
          </p>
        </div>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
