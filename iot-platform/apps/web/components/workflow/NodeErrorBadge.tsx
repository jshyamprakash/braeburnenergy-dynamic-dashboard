'use client';

/**
 * Node Error Badge
 *
 * Small red dot indicator displayed on nodes with validation errors.
 * Positioned absolutely in top-right corner.
 */
export default function NodeErrorBadge() {
  return (
    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 dark:bg-red-400 rounded-full border-2 border-white dark:border-gray-800 shadow-lg animate-pulse" />
  );
}
