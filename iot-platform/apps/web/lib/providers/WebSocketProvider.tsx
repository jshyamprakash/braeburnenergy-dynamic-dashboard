'use client';

import { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { connectionToasts } from '../utils/toast';

const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';

interface WebSocketContextValue {
  socket: Socket;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocketContext(): Socket {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context.socket;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const toastShown = useRef(false);

  // Initialize socket in useRef (not module-level global)
  if (!socketRef.current) {
    socketRef.current = io(WEBSOCKET_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Connection event handlers (only set once)
    socketRef.current.on('connect', () => {
      console.log('[WebSocket] Connected:', socketRef.current!.id);
      if (!toastShown.current) {
        connectionToasts.connected();
        toastShown.current = true;
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      connectionToasts.disconnected();
      toastShown.current = false;
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('[WebSocket] Connection Error:', error);
      if (!toastShown.current) {
        connectionToasts.error(error);
      }
    });

    socketRef.current.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </WebSocketContext.Provider>
  );
}
