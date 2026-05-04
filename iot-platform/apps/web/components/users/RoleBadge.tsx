import type { UserRole } from '@repo/types';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const styles: Record<UserRole, { bg: string; text: string; label: string }> = {
    SuperAdmin: {
      bg: 'bg-rose-100 dark:bg-rose-900/40',
      text: 'text-rose-700 dark:text-rose-300',
      label: 'SuperAdmin',
    },
    Admin: {
      bg: 'bg-violet-100 dark:bg-violet-900/40',
      text: 'text-violet-700 dark:text-violet-300',
      label: 'Admin',
    },
    Operator: {
      bg: 'bg-sky-100 dark:bg-sky-900/40',
      text: 'text-sky-700 dark:text-sky-300',
      label: 'Operator',
    },
    Viewer: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      label: 'Viewer',
    },
  };

  const style = styles[role];

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${style.bg} ${style.text} ${className}`}>
      {style.label}
    </span>
  );
}
