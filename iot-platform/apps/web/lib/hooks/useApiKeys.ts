'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApiKey,
  CreateApiKeyInput,
  UpdateApiKeyInput,
  PaginatedResponse,
} from '@repo/types';
import { apiClient } from '../api-client';

// Query keys
const API_KEY_KEYS = {
  all: ['api-keys'] as const,
  lists: () => [...API_KEY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...API_KEY_KEYS.lists(), filters] as const,
  details: () => [...API_KEY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...API_KEY_KEYS.details(), id] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List all API keys for the authenticated user
 */
export function useApiKeys() {
  return useQuery({
    queryKey: API_KEY_KEYS.list({}),
    queryFn: async () => {
      const response = await apiClient.get<ApiKey[]>('/api-keys');
      return response.data;
    },
  });
}

/**
 * Get a specific API key by ID
 */
export function useApiKey(id: string) {
  return useQuery({
    queryKey: API_KEY_KEYS.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiKey>(`/api-keys/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new API key
 * Returns the plain-text key which is shown only once
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateApiKeyInput) => {
      const response = await apiClient.post<
        ApiKey & { key: string }
      >('/api-keys', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate API key list to refresh
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() });
    },
  });
}

/**
 * Update an API key (name, permissions, expiresAt)
 */
export function useUpdateApiKey(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateApiKeyInput) => {
      const response = await apiClient.patch<ApiKey>(
        `/api-keys/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate specific key and list
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() });
    },
  });
}

/**
 * Revoke (soft delete) an API key
 * Key is deactivated but record kept for audit
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api-keys/${id}/revoke`, {});
    },
    onSuccess: () => {
      // Invalidate API key list to refresh
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() });
    },
  });
}

/**
 * Permanently delete an API key
 */
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api-keys/${id}`);
    },
    onSuccess: () => {
      // Invalidate API key list to refresh
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() });
    },
  });
}

/**
 * Rotate an API key (generate new key value, keep ID/permissions)
 * Returns the new plain-text key which is shown only once
 */
export function useRotateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<
        ApiKey & { key: string }
      >(`/api-keys/${id}/rotate`, {});
      return response.data;
    },
    onSuccess: () => {
      // Invalidate API key list to refresh
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() });
    },
  });
}
