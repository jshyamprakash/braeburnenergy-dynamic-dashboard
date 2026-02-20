'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { WebSocketEvent, DeviceState } from '../types';
import { connectionToasts } from '../utils/toast';

const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';

// Singleton socket instance - shared across all components
let socketInstance: Socket | null = null;
let connectionCount = 0;
let toastShown = false;

function getSocketInstance(): Socket {
  if (!socketInstance) {
    socketInstance = io(WEBSOCKET_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Connection event handlers (only set once)
    socketInstance.on('connect', () => {
      console.log('[WebSocket] Connected:', socketInstance!.id);
      if (!toastShown) {
        connectionToasts.connected();
        toastShown = true;
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      connectionToasts.disconnected();
      toastShown = false;
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[WebSocket] Connection Error:', error);
      if (!toastShown) {
        connectionToasts.error(error);
      }
    });

    socketInstance.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  }

  return socketInstance;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socket = getSocketInstance();

  useEffect(() => {
    connectionCount++;
    console.log(`[WebSocket] Component mounted (${connectionCount} active)`);

    // Update connection state
    setIsConnected(socket.connected);

    // Listen for connection state changes
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Cleanup on unmount - but DON'T disconnect the shared socket
    return () => {
      connectionCount--;
      console.log(`[WebSocket] Component unmounted (${connectionCount} remaining)`);

      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);

      // Only disconnect if no components are using the socket
      if (connectionCount === 0) {
        console.log('[WebSocket] No active components, keeping connection alive');
        // Note: We keep the connection alive for better UX
        // Socket will auto-reconnect if needed
      }
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
    const handleStateUpdate = (update: { deviceId: string; data: any; timestamp: Date }) => {
      console.log('[WebSocket] Received device state:', update);
      // Convert backend format to DeviceState format
      onUpdate({
        id: `ws-${Date.now()}`,
        deviceId: update.deviceId,
        data: update.data,
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
    const handlers = {
      'device:state:created': (payload: any) =>
        onUpdate({ type: 'device:state:created', payload }),
      'device:updated': (payload: any) =>
        onUpdate({ type: 'device:updated', payload }),
      'device:deleted': (payload: any) =>
        onUpdate({ type: 'device:deleted', payload }),
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
  onStepUpdate: (step: any) => void,
  onComplete: (completion: any) => void
) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !workflowId) return;

    console.log(`[WebSocket] Subscribing to workflow execution: ${workflowId}`);

    // Subscribe to workflow room
    socket.emit('subscribe:workflow', workflowId);

    // Listen for step updates
    const handleStepUpdate = (step: any) => {
      console.log('[WebSocket] Received workflow step:', step);
      onStepUpdate(step);
    };

    // Listen for completion
    const handleCompletion = (completion: any) => {
      console.log('[WebSocket] Workflow execution completed:', completion);
      onComplete(completion);
    };

    socket.on('workflow:execution:step', handleStepUpdate);
    socket.on('workflow:execution:completed', handleCompletion);

    // Cleanup
    return () => {
      console.log(`[WebSocket] Unsubscribing from workflow: ${workflowId}`);
      socket.emit('unsubscribe:workflow', workflowId);
      socket.off('workflow:execution:step', handleStepUpdate);
      socket.off('workflow:execution:completed', handleCompletion);
    };
  }, [socket, isConnected, workflowId, onStepUpdate, onComplete]);
}
