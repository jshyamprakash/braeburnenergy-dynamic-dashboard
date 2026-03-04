'use client';

import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useClearAllNotifications } from '@/lib/hooks/useNotifications';
import { format } from 'date-fns';

interface NotificationDropdownProps {
  onClose: () => void;
}

const SEVERITY_COLORS = {
  INFO: 'border-l-blue-500',
  WARNING: 'border-l-amber-500',
  CRITICAL: 'border-l-red-600',
};

const SEVERITY_BADGE_COLORS = {
  INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  WARNING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { data: notifData, isLoading } = useNotifications({ limit: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const clearAll = useClearAllNotifications();

  const notifications = notifData?.data ?? [];

  const handleMarkRead = (notificationId: string) => {
    markRead.mutate(notificationId);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      {/* Dropdown Panel */}
      <div className="absolute right-0 top-full mt-2 w-96 max-h-96 rounded-lg shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden z-40">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  disabled={markAllRead.isPending}
                >
                  Mark all read
                </button>
                <button
                  onClick={() => clearAll.mutate()}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  disabled={clearAll.isPending}
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-gray-500 dark:text-gray-400">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notif) => (
                <button
                  key={notif.notificationId}
                  onClick={() => handleMarkRead(notif.notificationId)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-l-4 ${
                    SEVERITY_COLORS[notif.severity as keyof typeof SEVERITY_COLORS]
                  } ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{notif.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            SEVERITY_BADGE_COLORS[notif.severity as keyof typeof SEVERITY_BADGE_COLORS]
                          }`}
                        >
                          {notif.severity}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-500">
                          {format(new Date(notif.createdAt), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
