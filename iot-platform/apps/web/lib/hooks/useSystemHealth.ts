'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface SystemHealthResult {
  nats: {
    status: 'green' | 'amber' | 'red';
    streams?: Array<{ name: string; messages: number; bytes: number }>;
    error?: string;
  };
  redis: {
    status: 'green' | 'amber' | 'red';
    latencyMs?: number;
    memoryUsed?: string;
    error?: string;
  };
  bullmq: {
    status: 'green' | 'amber' | 'red';
    waiting?: number;
    active?: number;
    failed?: number;
    error?: string;
  };
  mongodb: {
    status: 'green' | 'amber' | 'red';
    isPrimary?: boolean;
    replicaSet?: string;
    primary?: string;
    error?: string;
  };
  gateways: {
    status: 'green' | 'amber' | 'red';
    modbus: number;
    opcua: number;
    mqtt: number;
    bacnet: number;
    enip: number;
    total: number;
  };
  overall: 'green' | 'amber' | 'red';
  timestamp: string;
}

export const systemHealthKeys = {
  all: ['system-health'] as const,
  detail: () => [...systemHealthKeys.all, 'detail'] as const,
};

export function useSystemHealth(pollInterval = 30000) {
  return useQuery<SystemHealthResult>({
    queryKey: systemHealthKeys.detail(),
    queryFn: async () => {
      const { data } = await apiClient.get<SystemHealthResult>('/health/system');
      return data;
    },
    refetchInterval: pollInterval,
    staleTime: 5000, // data is fresh for 5s; refetch every 30s
    retry: 1,
  });
}
