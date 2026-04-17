import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { NotificationChannel, EscalationPolicy, CreateNotificationChannelBody, CreateEscalationPolicyBody, UpdateNotificationChannelBody, UpdateEscalationPolicyBody } from '@repo/types';

// ─── NotificationChannel Hooks ──────────────────────────────────────────

export function useNotificationChannels() {
  return useQuery<NotificationChannel[]>({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      const response = await apiClient.get<NotificationChannel[]>('/notification-channels');
      return response.data;
    },
    refetchInterval: 30000,
  });
}

export function useNotificationChannel(id: string) {
  return useQuery<NotificationChannel>({
    queryKey: ['notification-channels', id],
    queryFn: async () => {
      const response = await apiClient.get<NotificationChannel>(`/notification-channels/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateNotificationChannelBody) => {
      const response = await apiClient.post<{ success: boolean; data: NotificationChannel }>(
        '/notification-channels',
        body
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useUpdateNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateNotificationChannelBody }) => {
      const response = await apiClient.patch<{ success: boolean; data: NotificationChannel }>(
        `/notification-channels/${id}`,
        body
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useDeleteNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/notification-channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useToggleNotificationChannel() {
  return useUpdateNotificationChannel();
}

// ─── EscalationPolicy Hooks ───────────────────────────────────────────

export function useEscalationPolicies() {
  return useQuery<EscalationPolicy[]>({
    queryKey: ['escalation-policies'],
    queryFn: async () => {
      const response = await apiClient.get<EscalationPolicy[]>('/escalation-policies');
      return response.data;
    },
    refetchInterval: 30000,
  });
}

export function useEscalationPolicy(id: string) {
  return useQuery<EscalationPolicy>({
    queryKey: ['escalation-policies', id],
    queryFn: async () => {
      const response = await apiClient.get<EscalationPolicy>(`/escalation-policies/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateEscalationPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateEscalationPolicyBody) => {
      const response = await apiClient.post<{ success: boolean; data: EscalationPolicy }>(
        '/escalation-policies',
        body
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] });
    },
  });
}

export function useUpdateEscalationPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateEscalationPolicyBody }) => {
      const response = await apiClient.patch<{ success: boolean; data: EscalationPolicy }>(
        `/escalation-policies/${id}`,
        body
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] });
    },
  });
}

export function useDeleteEscalationPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/escalation-policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] });
    },
  });
}

export function useToggleEscalationPolicy() {
  return useUpdateEscalationPolicy();
}
