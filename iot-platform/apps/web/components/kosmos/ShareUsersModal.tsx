'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUsers } from '@/lib/hooks/useUsers';
import { useAppSelector } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { useShareDashboard } from '@/lib/hooks/useDashboards';
import { toast } from 'sonner';
import type { User } from '@repo/types';
import type { DashboardShareAssignment } from '@repo/types';
import type { KosmosPage } from './types';

const TAB_ICON: Record<string, string> = {
  overview: '◈',
  combustionDl: '◑',
  beAgent: '⟳',
  kosmosArchitecture: '⬡',
};

interface ShareUsersModalProps {
  dashboardId: string;
  currentSharedUsers: DashboardShareAssignment[];
  availablePages: KosmosPage[];
  onClose: () => void;
  onSaved: (assignments: DashboardShareAssignment[]) => void;
}

export default function ShareUsersModal({
  dashboardId,
  currentSharedUsers,
  availablePages,
  onClose,
  onSaved,
}: ShareUsersModalProps) {
  const currentUser = useAppSelector(selectUser);
  const { data: allUsers = [] } = useUsers(currentUser?.organizationId ?? undefined);

  // Map userId → pageIds (empty = all pages)
  // Guard against legacy MongoDB data where entries may have undefined userId
  const [assignments, setAssignments] = useState<Map<string, string[]>>(() => {
    const entries = currentSharedUsers
      .filter((a: any) => a && typeof a === 'object' && typeof a.userId === 'string' && a.userId)
      .map((a): [string, string[]] => [a.userId, Array.isArray(a.pageIds) ? a.pageIds : []]);
    return new Map(entries);
  });

  // Which user's page access is currently being configured
  const [configUserId, setConfigUserId] = useState<string>('');

  const shareDashboard = useShareDashboard();
  const isSaving = shareDashboard.isPending;

  const selectedUserIds = Array.from(assignments.keys());

  const usersByRole = useMemo(() => {
    const order: Array<User['role']> = ['Admin', 'Operator', 'Viewer'];
    return order
      .map((role) => ({ role, users: allUsers.filter((u: User) => u.role === role) }))
      .filter((g) => g.users.length > 0);
  }, [allUsers]);

  // Auto-select the first user for page configuration when assignments change
  useEffect(() => {
    if (!configUserId && selectedUserIds.length >= 1) {
      setConfigUserId(selectedUserIds[0]);
    }
  }, [selectedUserIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleUser = (userId: string) => {
    const next = new Map(assignments);
    if (next.has(userId)) {
      next.delete(userId);
      if (configUserId === userId) {
        setConfigUserId(next.size > 0 ? Array.from(next.keys())[0] : '');
      }
    } else {
      next.set(userId, []); // [] = all pages
      if (!configUserId) setConfigUserId(userId);
    }
    setAssignments(next);
  };

  const handleTogglePage = (pageId: string) => {
    if (!configUserId) return;
    const next = new Map(assignments);
    const current = next.get(configUserId) ?? [];

    let updated: string[];
    if (current.length === 0) {
      // "All pages" selected — unchecking one means all others explicitly listed
      updated = availablePages.map((p) => p.id).filter((id) => id !== pageId);
    } else if (current.includes(pageId)) {
      updated = current.filter((id) => id !== pageId);
    } else {
      const newList = [...current, pageId];
      // Normalize: if all pages now selected, store as [] (semantic "all")
      updated = newList.length === availablePages.length ? [] : newList;
    }
    next.set(configUserId, updated);
    setAssignments(next);
  };

  const handleSelectAllPages = () => {
    if (!configUserId) return;
    const next = new Map(assignments);
    next.set(configUserId, []); // empty = all pages
    setAssignments(next);
  };

  const isPageSelected = (pageId: string): boolean => {
    if (!configUserId) return false;
    const pages = assignments.get(configUserId) ?? [];
    return pages.length === 0 || pages.includes(pageId); // empty = all selected
  };

  const getPageCount = (userId: string): string => {
    const pages = assignments.get(userId) ?? [];
    return pages.length === 0 ? 'All tabs' : `${pages.length} tab${pages.length !== 1 ? 's' : ''}`;
  };

  const handleSave = async () => {
    try {
      const assignmentList: DashboardShareAssignment[] = Array.from(assignments.entries()).map(
        ([userId, pageIds]) => ({ userId, pageIds })
      );

      const res = await shareDashboard.mutateAsync({ dashboardId, assignments: assignmentList });
      toast.success('Dashboard shared successfully');
      onSaved(res.data?.sharedWithUsers ?? assignmentList);
      onClose();
    } catch (error: any) {
      console.error('Share error:', error);
      toast.error(error?.message || 'Failed to share dashboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Share Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex gap-4">
          {/* ── Left: user selection ── */}
          <div className="flex-1 min-w-0">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Share with users
            </div>
            <div className="max-h-56 overflow-y-auto rounded border border-gray-700 bg-gray-950 dark:border-gray-600 dark:bg-gray-900">
              {usersByRole.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No users found. Create users at <span className="text-cyan-400">/users</span>.
                </div>
              ) : (
                <div>
                  {usersByRole.map(({ role, users }) => (
                    <div key={role}>
                      <div className="sticky top-0 bg-gray-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                        {role}
                      </div>
                      <div className="divide-y divide-gray-800 dark:divide-gray-700">
                        {users.map((user: User) => {
                          const isSelected = assignments.has(user.id);
                          return (
                            <label
                              key={user.id}
                              className={`flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-800 dark:hover:bg-gray-700 ${
                                configUserId === user.id && isSelected ? 'bg-gray-800/60' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleUser(user.id)}
                                className="h-4 w-4 cursor-pointer rounded border-gray-500 bg-gray-800 text-cyan-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-100 truncate">
                                  {user.username}
                                </div>
                                {isSelected && (
                                  <div className="text-[10px] text-cyan-500 font-mono">
                                    {getPageCount(user.id)}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setConfigUserId(user.id); }}
                                  className={`text-[10px] px-2 py-0.5 rounded font-mono tracking-wider transition-colors ${
                                    configUserId === user.id
                                      ? 'bg-cyan-700 text-white'
                                      : 'text-cyan-500 hover:text-cyan-300'
                                  }`}
                                >
                                  {configUserId === user.id ? 'editing' : 'config →'}
                                </button>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: page access for selected user ── */}
          {selectedUserIds.length > 0 && (
            <div className="w-44 flex-shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Tab access
                </div>
                <button
                  onClick={handleSelectAllPages}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300"
                >
                  All
                </button>
              </div>

              {/* User selector dropdown */}
              {selectedUserIds.length > 1 && (
                <select
                  value={configUserId}
                  onChange={(e) => setConfigUserId(e.target.value)}
                  className="mb-2 w-full rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:outline-none"
                >
                  {selectedUserIds.map((uid) => {
                    const u = allUsers.find((u: User) => u.id === uid);
                    return (
                      <option key={uid} value={uid}>
                        {u?.username ?? uid.slice(-6)}
                      </option>
                    );
                  })}
                </select>
              )}

{/* auto-focus single selected user */}

              <div className="rounded border border-gray-700 bg-gray-950 dark:border-gray-600 dark:bg-gray-900">
                {availablePages.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">No pages</div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {availablePages.map((page) => (
                      <label
                        key={page.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <span className="w-4 text-center font-mono text-xs text-cyan-400">
                          {TAB_ICON[page.mandatoryType ?? ''] ?? '◻'}
                        </span>
                        <span className="flex-1 text-xs font-medium text-gray-200 truncate">{page.name}</span>
                        <input
                          type="checkbox"
                          checked={isPageSelected(page.id)}
                          onChange={() => handleTogglePage(page.id)}
                          className="h-3.5 w-3.5 cursor-pointer rounded border-gray-500 bg-gray-800 text-cyan-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-gray-600 leading-tight">
                All tabs checked = user sees everything
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
