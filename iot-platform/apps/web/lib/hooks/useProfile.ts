import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', payload),
  });
}

export function useLogoutAll() {
  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout-all', {}),
  });
}

export function useRecoverySetup() {
  return useMutation({
    mutationFn: (payload: { publicKey: string }) =>
      apiClient.post('/api/v1/auth/recovery/setup', payload),
  });
}
