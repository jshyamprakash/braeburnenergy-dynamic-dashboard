'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { User, UserRole } from '@repo/types';
import { useUpdateUser } from '@/lib/hooks/useUsers';

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
  callerRole: UserRole;
}

export function EditUserModal({ isOpen, user, onClose, onSuccess, callerRole }: EditUserModalProps) {
  const updateUserMutation = useUpdateUser();
  const [formData, setFormData] = useState({ role: 'Operator' as UserRole, isActive: true });

  useEffect(() => {
    if (user) setFormData({ role: user.role, isActive: user.isActive });
  }, [user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateUserMutation.mutateAsync({
        userId: user.id,
        updates: {
          role: formData.role !== user.role ? formData.role : undefined,
          isActive: formData.isActive !== user.isActive ? formData.isActive : undefined,
        },
      });

      toast.success('User updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  if (!isOpen || !user) return null;

  const availableRoles: UserRole[] = callerRole === 'SuperAdmin'
    ? ['Admin', 'Operator', 'Viewer']
    : ['Operator', 'Viewer'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Edit User</h2>

        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          <p>{user.username} ({user.email})</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-800"
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Account Active
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Deactivating will revoke all active sessions
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
