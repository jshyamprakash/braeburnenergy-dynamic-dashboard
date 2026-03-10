import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { User, UserRole } from '@repo/types';

interface UpdateUserInput {
  role?: UserRole;
  isActive?: boolean;
  unlock?: boolean;
}

interface UpdateUserResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  updatedAt: string;
}

/**
 * Fetch all users in organization (requires user:read permission)
 */
export function useUsers(organizationId?: string) {
  return useQuery<User[], Error, User[]>({
    queryKey: ['users', organizationId],
    queryFn: async () => {
      const url = organizationId ? `/auth/users?organizationId=${organizationId}` : `/auth/users`;
      const res = await apiClient.get<User[]>(url);
      return res.data || [];
    },
  });
}

/**
 * Update user role, status, or unlock (requires user:update permission)
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: UpdateUserInput }) => {
      const res = await apiClient.patch<{ data: UpdateUserResponse }>(`/auth/users/${userId}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Delete user (requires user:delete permission — SuperAdmin only)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/auth/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
