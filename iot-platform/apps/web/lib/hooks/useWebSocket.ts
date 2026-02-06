'use client';

import { useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { WebSocketEvent, DeviceState } from '../types';

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
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
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

    // Listen for state updates
    const handleStateUpdate = (event: WebSocketEvent) => {
      if (event.type === 'device:state:created') {
        if (event.payload.deviceId === deviceId) {
          onUpdate(event.payload.state);
        }
      }
    };

    socket.on('device:state:update', handleStateUpdate);

    // Cleanup
    return () => {
      console.log(`[WebSocket] Unsubscribing from device: ${deviceId}`);
      socket.emit('unsubscribe:device', deviceId);
      socket.off('device:state:update', handleStateUpdate);
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
