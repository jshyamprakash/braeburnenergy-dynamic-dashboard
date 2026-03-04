export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>

        {/* Rows */}
        {[...Array(5)].map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid grid-cols-7 gap-4 p-4 border-b border-gray-200 dark:border-gray-700"
          >
            {[...Array(7)].map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
