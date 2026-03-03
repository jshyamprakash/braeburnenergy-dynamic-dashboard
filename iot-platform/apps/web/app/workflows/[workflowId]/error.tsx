'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
