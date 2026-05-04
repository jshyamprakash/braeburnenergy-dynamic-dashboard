/**
 * StatusBadge Component
 *
 * Renders a colored dot overlay for node execution status.
 * Positioned in the top-right corner of workflow nodes.
 */

interface StatusBadgeProps {
  status?: 'idle' | 'running' | 'completed' | 'failed';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  // idle status: hidden
  if (!status || status === 'idle') {
    return null;
  }

  // Determine color and animation based on status
  const getStatusStyles = () => {
    switch (status) {
      case 'running':
        return 'bg-indigo-500 animate-pulse';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div
      className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full z-10 ${getStatusStyles()} dark:brightness-110`}
      title={`Status: ${status}`}
    />
  );
}
