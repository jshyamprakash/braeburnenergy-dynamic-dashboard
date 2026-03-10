'use client';

import { useState, useMemo } from 'react';
import { useUsers } from '@/lib/hooks/useUsers';
import { useAppSelector } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type { User } from '@repo/types';

interface ShareUsersModalProps {
  dashboardId: string;
  currentSharedUsers: string[];
  onClose: () => void;
  onSaved: (userIds: string[]) => void;
}

export default function ShareUsersModal({
  dashboardId,
  currentSharedUsers,
  onClose,
  onSaved,
}: ShareUsersModalProps) {
  const currentUser = useAppSelector(selectUser);
  const { data: allUsers = [] } = useUsers(currentUser?.organizationId ?? undefined);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(currentSharedUsers)
  );
  const [isSaving, setIsSaving] = useState(false);

  // Filter to Viewer role only
  const viewerUsers = useMemo(() => {
    return allUsers.filter((user: User) => user.role === 'Viewer');
  }, [allUsers]);

  const handleToggleUser = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userIds = Array.from(selectedUserIds);
      await apiClient.post(`/dashboards/${dashboardId}/share`, { userIds });
      toast.success('Dashboard shared successfully');
      onSaved(userIds);
      onClose();
    } catch (error: any) {
      console.error('Share error:', error);
      toast.error(error?.message || 'Failed to share dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Share Dashboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* User list */}
        <div className="mb-6 max-h-80 overflow-y-auto rounded border border-gray-700 bg-gray-950 dark:border-gray-600 dark:bg-gray-900">
          {viewerUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No Viewer accounts found. Create users at <span className="text-cyan-400">/users</span> page.
            </div>
          ) : (
            <div className="divide-y divide-gray-700 dark:divide-gray-600">
              {viewerUsers.map((user: User) => (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-3 p-3 hover:bg-gray-900 dark:hover:bg-gray-700"
                >
                  {/* Avatar initial */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-sm font-semibold">
                    {user.username[0]?.toUpperCase()}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-100">{user.username}</div>
                    <div className="truncate text-xs text-gray-500">{user.email}</div>
                  </div>

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => handleToggleUser(user.id)}
                    className="h-4 w-4 cursor-pointer rounded border-gray-500 bg-gray-800 text-cyan-500"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 dark:bg-cyan-600 dark:hover:bg-cyan-700"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
