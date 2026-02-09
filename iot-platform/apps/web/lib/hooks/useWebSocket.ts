'use client';

import { useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { WebSocketEvent, DeviceState } from '../types';
import { connectionToasts } from '../utils/toast';

const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(WEBSOCKET_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.id);
      setIsConnected(true);
      connectionToasts.connected();
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      connectionToasts.disconnected();
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection Error:', error);
      connectionToasts.error(error);
    });

    socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
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
