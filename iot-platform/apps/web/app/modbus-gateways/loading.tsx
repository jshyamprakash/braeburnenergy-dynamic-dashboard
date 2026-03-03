import { Skeleton, TableRowSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-3"><Skeleton className="h-4 w-24" /></th>
              <th className="px-4 py-3"><Skeleton className="h-4 w-20" /></th>
              <th className="px-4 py-3"><Skeleton className="h-4 w-24" /></th>
              <th className="px-4 py-3"><Skeleton className="h-4 w-16" /></th>
              <th className="px-4 py-3"><Skeleton className="h-4 w-20" /></th>
              <th className="px-4 py-3"><Skeleton className="h-4 w-16" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={6} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
