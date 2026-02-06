import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { config } from '../config/config';

/**
 * WebSocket Server for Real-Time Communication
 *
 * Provides real-time updates for:
 * - Device state changes
 * - Device status updates
 * - Live telemetry streaming
 */

export interface DeviceStateUpdate {
  deviceId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface DeviceStatusUpdate {
  deviceId: string;
  status: 'online' | 'offline';
  timestamp: Date;
}

/**
 * Create and configure Socket.IO server
 */
export function createWebSocketServer(httpServer?: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    path: '/ws',
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Subscribe to device updates
    socket.on('subscribe:device', (deviceId: string) => {
      socket.join(`device:${deviceId}`);
      console.log(`[WS] Client ${socket.id} subscribed to device ${deviceId}`);

      socket.emit('subscribed', {
        deviceId,
        timestamp: new Date().toISOString(),
      });
    });

    // Unsubscribe from device updates
    socket.on('unsubscribe:device', (deviceId: string) => {
      socket.leave(`device:${deviceId}`);
      console.log(`[WS] Client ${socket.id} unsubscribed from device ${deviceId}`);

      socket.emit('unsubscribed', {
        deviceId,
        timestamp: new Date().toISOString(),
      });
    });

    // Subscribe to all devices
    socket.on('subscribe:all', () => {
      socket.join('all-devices');
      console.log(`[WS] Client ${socket.id} subscribed to all devices`);

      socket.emit('subscribed', {
        scope: 'all',
        timestamp: new Date().toISOString(),
      });
    });

    // Unsubscribe from all devices
    socket.on('unsubscribe:all', () => {
      socket.leave('all-devices');
      console.log(`[WS] Client ${socket.id} unsubscribed from all devices`);

      socket.emit('unsubscribed', {
        scope: 'all',
        timestamp: new Date().toISOString(),
      });
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
      });
    });

    // Disconnection handler
    socket.on('disconnect', (reason) => {
      console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`[WS] Socket error for ${socket.id}:`, error);
    });
  });

  return io;
}

/**
 * Broadcast device state update to subscribers
 */
export function broadcastDeviceState(
  io: SocketIOServer,
  update: DeviceStateUpdate
) {
  // Emit to device-specific subscribers
  io.to(`device:${update.deviceId}`).emit('device:state', update);

  // Emit to "all devices" subscribers
  io.to('all-devices').emit('device:state', update);

  console.log(`[WS] Broadcasted state update for device ${update.deviceId}`);
}

/**
 * Broadcast device status update to subscribers
 */
export function broadcastDeviceStatus(
  io: SocketIOServer,
  update: DeviceStatusUpdate
) {
  // Emit to device-specific subscribers
  io.to(`device:${update.deviceId}`).emit('device:status', update);

  // Emit to "all devices" subscribers
  io.to('all-devices').emit('device:status', update);

  console.log(
    `[WS] Broadcasted status update for device ${update.deviceId}: ${update.status}`
  );
}

/**
 * Get connected client count
 */
export function getConnectedClientsCount(io: SocketIOServer): number {
  return io.engine.clientsCount;
}

/**
 * Get subscribers for a device
 */
export async function getDeviceSubscribers(
  io: SocketIOServer,
  deviceId: string
): Promise<string[]> {
  const room = io.sockets.adapter.rooms.get(`device:${deviceId}`);
  return room ? Array.from(room) : [];
}
