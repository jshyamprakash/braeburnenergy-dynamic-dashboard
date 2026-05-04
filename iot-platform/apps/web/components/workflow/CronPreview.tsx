'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { parseCron } from '@/lib/utils/cron';

interface CronPreviewProps {
  expression: string;
  timezone?: string;
}

export function CronPreview({ expression, timezone }: CronPreviewProps) {
  const result = useMemo(() => {
    if (!expression) {
      return { description: '', nextRuns: [], error: 'Enter a cron expression' };
    }
    return parseCron(expression);
  }, [expression]);

  if (result.error) {
    return (
      <div className="mt-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-300">⚠ {result.error}</p>
      </div>
    );
  }

  if (!result.description) {
    return null;
  }

  return (
    <div className="mt-2 p-3 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{result.description}</p>
      {result.nextRuns.length > 0 && (
        <div className="mt-2 text-xs text-indigo-700 dark:text-indigo-300">
          <p className="font-semibold">Next runs:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            {result.nextRuns.map((date, idx) => (
              <li key={idx}>{format(date, 'MMM d, yyyy HH:mm')}</li>
            ))}
          </ul>
        </div>
      )}
      {timezone && timezone !== 'UTC' && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">Timezone: {timezone}</p>
      )}
    </div>
  );
}
