'use client';

import { useState, useMemo } from 'react';
import { useUsers } from '@/lib/hooks/useUsers';
import { useAppSelector } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type { User } from '@repo/types';
import type { KosmosPage } from './types';

const TAB_ICON: Record<string, string> = {
  overview: '◈',
  combustionDl: '◑',
  beAgent: '⟳',
  kosmosArchitecture: '⬡',
};

interface ShareUsersModalProps {
  dashboardId: string;
  currentSharedUsers: string[];
  currentSharedPageIds: string[];
  availablePages: KosmosPage[];
  onClose: () => void;
  onSaved: (userIds: string[], pageIds: string[]) => void;
}

export default function ShareUsersModal({
  dashboardId,
  currentSharedUsers,
  currentSharedPageIds,
  availablePages,
  onClose,
  onSaved,
}: ShareUsersModalProps) {
  const currentUser = useAppSelector(selectUser);
  const { data: allUsers = [] } = useUsers(currentUser?.organizationId ?? undefined);

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(currentSharedUsers)
  );

  // When currentSharedPageIds is empty it means "all pages" — pre-check all
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set(
      currentSharedPageIds.length > 0
        ? currentSharedPageIds
        : availablePages.map((p) => p.id)
    )
  );

  const [isSaving, setIsSaving] = useState(false);

  const usersByRole = useMemo(() => {
    const order: Array<User['role']> = ['Admin', 'Operator', 'Viewer'];
    return order
      .map((role) => ({ role, users: allUsers.filter((u: User) => u.role === role) }))
      .filter((g) => g.users.length > 0);
  }, [allUsers]);

  const handleToggleUser = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUserIds(next);
  };

  const handleTogglePage = (pageId: string) => {
    const next = new Set(selectedPageIds);
    if (next.has(pageId)) next.delete(pageId);
    else next.add(pageId);
    setSelectedPageIds(next);
  };

  const handleSelectAllPages = () => {
    setSelectedPageIds(new Set(availablePages.map((p) => p.id)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userIds = Array.from(selectedUserIds);
      // If all pages selected, send empty array (= "all pages" semantic)
      const allSelected = availablePages.every((p) => selectedPageIds.has(p.id));
      const pageIds = allSelected ? [] : Array.from(selectedPageIds);

      const res = await apiClient.post<{ sharedWithUsers: string[]; sharedPageIds: string[] }>(
        `/dashboards/${dashboardId}/share`,
        { userIds, pageIds }
      );
      toast.success('Dashboard shared successfully');
      const returnedPageIds = res.data?.sharedPageIds ?? pageIds;
      onSaved(userIds, returnedPageIds);
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200" aria-label="Close">
            ✕
          </button>
        </div>

        {/* ── Tabs to share ── */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Tabs to share
            </span>
            <button
              onClick={handleSelectAllPages}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Select all
            </button>
          </div>
          <div className="rounded border border-gray-700 bg-gray-950 dark:border-gray-600 dark:bg-gray-900">
            {availablePages.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-500">No pages available</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {availablePages.map((page) => (
                  <label
                    key={page.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-900 dark:hover:bg-gray-700"
                  >
                    <span className="w-5 text-center font-mono text-sm text-cyan-400">
                      {TAB_ICON[page.mandatoryType ?? ''] ?? '◻'}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-200">{page.name}</span>
                    {page.isMandatory && (
                      <span className="text-xs text-gray-600">default</span>
                    )}
                    <input
                      type="checkbox"
                      checked={selectedPageIds.has(page.id)}
                      onChange={() => handleTogglePage(page.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-500 bg-gray-800 text-cyan-500"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Share with users ── */}
        <div className="mb-6">
          <div className="mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Share with users
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto rounded border border-gray-700 bg-gray-950 dark:border-gray-600 dark:bg-gray-900">
            {usersByRole.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No users found. Create users at <span className="text-cyan-400">/users</span> page.
              </div>
            ) : (
              <div>
                {usersByRole.map(({ role, users }) => (
                  <div key={role}>
                    <div className="sticky top-0 bg-gray-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                      {role}
                    </div>
                    <div className="divide-y divide-gray-800 dark:divide-gray-700">
                      {users.map((user: User) => (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-3 p-3 hover:bg-gray-900 dark:hover:bg-gray-700"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-sm font-semibold">
                            {user.username[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-100">{user.username}</div>
                            <div className="truncate text-xs text-gray-500">{user.email}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(user.id)}
                            onChange={() => handleToggleUser(user.id)}
                            className="h-4 w-4 cursor-pointer rounded border-gray-500 bg-gray-800 text-cyan-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
