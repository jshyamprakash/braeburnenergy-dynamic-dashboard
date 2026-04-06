'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AdminStatus {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

/** Fetch the single primary Admin account (role=Admin). Returns null if none exists. */
export function useAdminStatus() {
  return useQuery<AdminStatus | null>({
    queryKey: ['admin-status'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/auth/users');
      const users: any[] = res.data || [];
      const admin = users.find((u: any) => u.role === 'Admin');
      return admin
        ? {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            isActive: admin.isActive,
            mustChangePassword: admin.mustChangePassword ?? false,
            lastLogin: admin.lastLogin,
            createdAt: admin.createdAt,
          }
        : null;
    },
    staleTime: 30_000,
  });
}

/** Create the primary Admin account. Returns the one-time temp password. */
export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation<{ tempPassword: string }, Error, { username: string; email: string }>({
    mutationFn: async ({ username, email }) => {
      const res = await apiClient.post<{ tempPassword: string }>('/auth/admin/create', { username, email });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-status'] }),
  });
}

/** Rotate the SuperAdmin public key stored in MongoDB (ADR-053). */
export function useRotatePublicKey() {
  return useMutation<{ success: boolean }, Error, { publicKeyPem: string }>({
    mutationFn: async ({ publicKeyPem }) => {
      const res = await apiClient.put<{ success: boolean }>(
        '/auth/superadmin/rotate-public-key',
        { publicKeyPem }
      );
      return res.data;
    },
  });
}

/** Reset the primary Admin password. Returns new one-time temp password + admin info. */
export function useResetAdminPassword() {
  const qc = useQueryClient();
  return useMutation<{ tempPassword: string; username: string; email: string }, Error, void>({
    mutationFn: async () => {
      const res = await apiClient.post<{ tempPassword: string; username: string; email: string }>(
        '/auth/admin/reset-password',
        {}
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-status'] }),
  });
}
