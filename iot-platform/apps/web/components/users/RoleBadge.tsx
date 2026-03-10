import type { UserRole } from '@repo/types';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const styles: Record<UserRole, { bg: string; text: string; label: string }> = {
    SuperAdmin: {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-800 dark:text-purple-200',
      label: 'Super Admin',
    },
    Admin: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-800 dark:text-blue-200',
      label: 'Admin',
    },
    Operator: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-200',
      label: 'Operator',
    },
    Viewer: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-800 dark:text-gray-200',
      label: 'Viewer',
    },
  };

  const style = styles[role];

  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} ${className}`}>
      {style.label}
    </span>
  );
}
