'use client';

import { useEffect, useRef, useState } from 'react';
import type { WebSocketEvent, DeviceState } from '../types';
import { useWebSocketContext } from '../providers/WebSocketProvider';

export function useWebSocket() {
  const socket = useWebSocketContext();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return {
    socket,
    isConnected,
  };
}

// Hook for subscribing to device state updates
export function useDeviceStateUpdates(
  deviceId: string | null,
  onUpdate: (state: DeviceState) => void
) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !deviceId) return;

    console.log(`[WebSocket] Subscribing to device: ${deviceId}`);

    // Subscribe to device-specific updates
    socket.emit('subscribe:device', deviceId);

    // Listen for state updates (backend emits 'device:state')
    const handleStateUpdate = (update: { deviceId: string; data: Record<string, unknown>; derived?: Record<string, unknown>; timestamp: Date }) => {
      console.log('[WebSocket] Received device state:', update);
      // Convert backend format to DeviceState format
      onUpdate({
        id: `ws-${Date.now()}`,
        deviceId: update.deviceId,
        data: update.data,
        derived: update.derived,
        timestamp: new Date(update.timestamp).toISOString(),
      });
    };

    socket.on('device:state', handleStateUpdate);

    // Cleanup
    return () => {
      console.log(`[WebSocket] Unsubscribing from device: ${deviceId}`);
      socket.emit('unsubscribe:device', deviceId);
      socket.off('device:state', handleStateUpdate);
    };
  }, [socket, isConnected, deviceId, onUpdate]);
}

// Hook for subscribing to all device updates
export function useDeviceUpdates(onUpdate: (event: WebSocketEvent) => void) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('[WebSocket] Subscribing to all device updates');

    // Listen for device events
    const handlers: Record<string, (payload: unknown) => void> = {
      'device:state:created': (payload: unknown) =>
        onUpdate({ type: 'device:state:created', payload } as any),
      'device:updated': (payload: unknown) =>
        onUpdate({ type: 'device:updated', payload } as any),
      'device:deleted': (payload: unknown) =>
        onUpdate({ type: 'device:deleted', payload } as any),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup
    return () => {
      Object.keys(handlers).forEach((event) => {
        socket.off(event);
      });
    };
  }, [socket, isConnected, onUpdate]);
}

// Hook for subscribing to workflow execution updates
export function useWorkflowExecutionUpdates(
  workflowId: string | null,
  onStepUpdate: (step: unknown) => void,
  onComplete: (completion: unknown) => void,
  onDebugMessage?: (msg: unknown) => void
) {
  const { socket, isConnected } = useWebSocket();

  // Use refs so callbacks never become stale deps — avoids subscribe/unsubscribe loop
  const onStepUpdateRef = useRef(onStepUpdate);
  const onCompleteRef = useRef(onComplete);
  const onDebugMessageRef = useRef(onDebugMessage);
  useEffect(() => { onStepUpdateRef.current = onStepUpdate; });
  useEffect(() => { onCompleteRef.current = onComplete; });
  useEffect(() => { onDebugMessageRef.current = onDebugMessage; });

  useEffect(() => {
    if (!socket || !isConnected || !workflowId) return;

    console.log(`[WebSocket] Subscribing to workflow execution: ${workflowId}`);
    socket.emit('subscribe:workflow', workflowId);

    const handleStepUpdate = (step: unknown) => {
      console.log('[WebSocket] Received workflow step:', step);
      onStepUpdateRef.current(step);
    };
    const handleCompletion = (completion: unknown) => {
      console.log('[WebSocket] Workflow execution completed:', completion);
      onCompleteRef.current(completion);
    };
    const handleDebugMessage = (msg: unknown) => {
      console.log('[WebSocket] Received debug message:', msg);
      onDebugMessageRef.current?.(msg);
    };

    socket.on('workflow:execution:step', handleStepUpdate);
    socket.on('workflow:execution:completed', handleCompletion);
    socket.on('workflow:debug:message', handleDebugMessage);

    return () => {
      console.log(`[WebSocket] Unsubscribing from workflow: ${workflowId}`);
      socket.emit('unsubscribe:workflow', workflowId);
      socket.off('workflow:execution:step', handleStepUpdate);
      socket.off('workflow:execution:completed', handleCompletion);
      socket.off('workflow:debug:message', handleDebugMessage);
    };
  }, [socket, isConnected, workflowId]); // callbacks excluded — stable via refs
}
