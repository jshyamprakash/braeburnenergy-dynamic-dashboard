'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { LicenseModule } from '@repo/types';

interface UpdateModulesPayload {
  enabled: LicenseModule[];
}

/**
 * Hook for updating module configuration
 * PATCH /api/v1/modules (SuperAdmin only)
 */
export function useModuleConfig() {
  return useMutation({
    mutationFn: async (payload: UpdateModulesPayload) => {
      const response = await apiClient.patch<{ enabled: LicenseModule[] }>(
        '/api/v1/modules',
        payload
      );
      return response.data;
    },
  });
}
