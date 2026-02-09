import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create socket instance
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, // Don't connect immediately
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Connection event handlers (for debugging)
if (typeof window !== 'undefined') {
  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
  });
}
