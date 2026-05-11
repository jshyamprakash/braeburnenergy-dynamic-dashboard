'use client';

import { useState } from 'react';
import { useUsers, useUpdateUser, useDeleteUser } from '@/lib/hooks/useUsers';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { RoleBadge } from '@/components/users/RoleBadge';
import type { User } from '@repo/types';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Unlock, Lock } from 'lucide-react';

export default function UsersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { data, isLoading } = useUsers();
  const users: User[] = data || [];
  const visibleUsers = users.filter(u => {
    if (user?.role === 'SuperAdmin') return u.role === 'Admin';
    if (user?.role === 'Admin') return u.role === 'Operator' || u.role === 'Viewer';
    return false;
  });

  const canManage = (actorRole: string | undefined, targetRole: string) =>
    (actorRole === 'SuperAdmin' || actorRole === 'Admin') && targetRole !== 'SuperAdmin';
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deletingUserId) return;

    try {
      await deleteUserMutation.mutateAsync(deletingUserId);
      toast.success('User deleted successfully');
      setDeletingUserId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleUnlock = async (userId: string) => {
    try {
      await updateUserMutation.mutateAsync({
        userId,
        updates: { unlock: true },
      });
      toast.success('User account unlocked');
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlock user');
    }
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Manage organization users and roles
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400 dark:text-slate-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 border rounded-lg border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">No users found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Login</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleUsers.map((u) => {
                  const isLocked = !!(u.lockedUntil && new Date(u.lockedUntil) > new Date());
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 w-fit text-[11px] font-medium ${
                            u.isActive
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                              <Lock className="w-3 h-3" />
                              Locked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                        {formatDate(u.lastLogin)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canManage(user?.role, u.role) && (
                          <button
                            onClick={() => { setEditingUser(u); setIsEditOpen(true); }}
                            title="Edit"
                            disabled={updateUserMutation.isPending}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors disabled:opacity-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          )}
                          {isLocked && (
                            <button
                              onClick={() => handleUnlock(u.id)}
                              title="Unlock account"
                              disabled={updateUserMutation.isPending}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors disabled:opacity-50"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          )}
                          {canManage(user?.role, u.role) && (
                            <button
                              onClick={() => setDeletingUserId(u.id)}
                              title="Delete user"
                              disabled={deleteUserMutation.isPending}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modals */}
        <CreateUserModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {}} // useUsers hook will auto-refetch
          organizationId={user?.organizationId || ''}
          callerRole={user?.role || 'Viewer'}
        />

        <EditUserModal
          isOpen={isEditOpen}
          user={editingUser}
          onClose={() => {
            setIsEditOpen(false);
            setEditingUser(null);
          }}
          onSuccess={() => {}} // useUsers hook will auto-refetch
          callerRole={user?.role || 'Viewer'}
        />

        {/* Delete Confirmation Modal */}
        {deletingUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 p-6 shadow-[var(--shadow-modal)] border border-slate-200 dark:border-slate-700">
              <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">Delete User</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingUserId(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  disabled={deleteUserMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
