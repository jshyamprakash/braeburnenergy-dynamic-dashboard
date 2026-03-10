'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import type { Notification, NotificationListResponse } from '@repo/types';

export interface UseNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const queryClient = useQueryClient();
  const { unreadOnly = false, limit = 20, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: ['notifications', { unreadOnly, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('unreadOnly', String(unreadOnly));
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await apiClient.get<NotificationListResponse>(`/notifications?${params.toString()}`);
      return res.data;
    },
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete('/notifications');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('notification:new', () => {
      // Invalidate notifications query so it refetches
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.off('notification:new');
    };
  }, [socket, isConnected, queryClient]);
}
