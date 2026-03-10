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
import { Plus, Edit2, Trash2, Unlock } from 'lucide-react';

export default function UsersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { data, isLoading } = useUsers();
  const users: User[] = data || [];
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage organization users and roles
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Last Login</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400"></span>
                          Inactive
                        </span>
                      )}
                      {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                        <div className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                          🔒 Locked
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(u.lastLogin)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setIsEditOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                          title="Edit"
                          disabled={updateUserMutation.isPending}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                          <button
                            onClick={() => handleUnlock(u.id)}
                            className="text-orange-600 hover:text-orange-700 dark:text-orange-400 disabled:opacity-50"
                            title="Unlock"
                            disabled={updateUserMutation.isPending}
                          >
                            <Unlock className="h-4 w-4" />
                          </button>
                        )}
                        {user?.role === 'SuperAdmin' && (
                          <button
                            onClick={() => setDeletingUserId(u.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                            title="Delete"
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
              <h2 className="mb-2 text-xl font-bold text-red-600">Delete User</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingUserId(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  disabled={deleteUserMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
