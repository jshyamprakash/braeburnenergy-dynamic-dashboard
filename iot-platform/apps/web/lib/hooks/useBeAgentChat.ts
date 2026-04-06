'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useWebSocketContext } from '@/lib/providers/WebSocketProvider';
import { useCallback, useRef, useState } from 'react';

export interface BeAgentConfig {
  endpoint: string;
  model: string;
  apiKeySet: boolean;
}

export const beAgentKeys = {
  all: ['be-agent'] as const,
  config: () => [...beAgentKeys.all, 'config'] as const,
};

/**
 * Fetch current BE Agent config (endpoint, model, apiKeySet flag)
 */
export function useBeAgentConfig() {
  return useQuery<BeAgentConfig>({
    queryKey: beAgentKeys.config(),
    queryFn: async () => {
      const res = await apiClient.get<any>('/be-agent/config');
      return res.data;
    },
    staleTime: 60000,
    retry: 1,
  });
}

/**
 * Update BE Agent config (endpoint, apiKey, model)
 */
export function useUpdateBeAgentConfig() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { endpoint?: string; apiKey?: string; model?: string }
  >({
    mutationFn: async (payload) => {
      const res = await apiClient.patch<{ success: boolean }>('/be-agent/config', payload);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: beAgentKeys.config() }),
  });
}

export interface BeAgentChatToken {
  requestId: string;
  token: string;
  done: boolean;
  error?: string;
}

export interface BeAgentChatState {
  isStreaming: boolean;
  tokens: string[];
  error?: string;
  requestId: string;
}

/**
 * BE Agent chat streaming via Socket.io.
 * Handles Socket.io room subscription, sends message, collects tokens.
 */
export function useBeAgentChat() {
  const socket = useWebSocketContext();
  const requestIdRef = useRef<string>('');
  const [state, setState] = useState<BeAgentChatState>({
    isStreaming: false,
    tokens: [],
    requestId: '',
    error: undefined,
  });

  const generateRequestId = useCallback(() => {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const sendMessage = useCallback(
    async (message: string, deviceId?: string) => {
      if (!socket) {
        setState((prev) => ({ ...prev, error: 'Socket.io not connected' }));
        return;
      }

      const requestId = generateRequestId();
      requestIdRef.current = requestId;

      // Subscribe to token stream room
      socket.emit('subscribe:be-agent', requestId);

      setState({
        isStreaming: true,
        tokens: [],
        requestId,
        error: undefined,
      });

      // Listen for tokens
      const handleToken = (data: BeAgentChatToken) => {
        if (data.requestId !== requestId) return;

        if (data.error) {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: data.error,
          }));
          return;
        }

        if (data.done) {
          setState((prev) => ({ ...prev, isStreaming: false }));
          socket.off('be-agent:token', handleToken);
          socket.emit('unsubscribe:be-agent', requestId);
          return;
        }

        setState((prev) => ({
          ...prev,
          tokens: [...prev.tokens, data.token],
        }));
      };

      socket.on('be-agent:token', handleToken);

      // Send chat message (fire-and-forget, streaming via Socket.io)
      try {
        await apiClient.post<{ success: boolean; requestId: string }>('/be-agent/chat', {
          message,
          requestId,
          deviceId,
        });
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: err.message || 'Failed to send message',
        }));
        socket.off('be-agent:token', handleToken);
      }
    },
    [socket, generateRequestId]
  );

  const clearChat = useCallback(() => {
    if (socket && requestIdRef.current) {
      socket.emit('unsubscribe:be-agent', requestIdRef.current);
    }
    setState({
      isStreaming: false,
      tokens: [],
      requestId: '',
      error: undefined,
    });
  }, [socket]);

  return {
    ...state,
    sendMessage,
    clearChat,
  };
}
