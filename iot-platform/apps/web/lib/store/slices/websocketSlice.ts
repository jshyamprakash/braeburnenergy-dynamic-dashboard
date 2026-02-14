import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * WebSocket connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Device state update from WebSocket
 */
export interface DeviceStateUpdate {
  deviceId: string;
  data: Record<string, any>;
  timestamp: string;
  orgId?: string;
}

/**
 * WebSocket state interface
 */
export interface WebSocketState {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  reconnectAttempts: number;
  error: string | null;
  latestUpdates: Record<string, DeviceStateUpdate>; // deviceId -> latest update
  updateHistory: DeviceStateUpdate[]; // Recent updates for live stream
  maxHistorySize: number;
}

/**
 * Initial state
 */
const initialState: WebSocketState = {
  connectionStatus: 'disconnected',
  isConnected: false,
  reconnectAttempts: 0,
  error: null,
  latestUpdates: {},
  updateHistory: [],
  maxHistorySize: 100, // Keep last 100 updates
};

/**
 * WebSocket slice
 */
const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    /**
     * Set connection status
     */
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload;
      state.isConnected = action.payload === 'connected';

      if (action.payload === 'connected') {
        state.reconnectAttempts = 0;
        state.error = null;
      }
    },

    /**
     * Connection established
     */
    connectionEstablished: (state) => {
      state.connectionStatus = 'connected';
      state.isConnected = true;
      state.reconnectAttempts = 0;
      state.error = null;
    },

    /**
     * Connection lost
     */
    connectionLost: (state) => {
      state.connectionStatus = 'disconnected';
      state.isConnected = false;
    },

    /**
     * Connection error
     */
    connectionError: (state, action: PayloadAction<string>) => {
      state.connectionStatus = 'error';
      state.isConnected = false;
      state.error = action.payload;
    },

    /**
     * Increment reconnect attempts
     */
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
      state.connectionStatus = 'connecting';
    },

    /**
     * Reset reconnect attempts
     */
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },

    /**
     * Handle device state update from WebSocket
     */
    deviceStateUpdated: (state, action: PayloadAction<DeviceStateUpdate>) => {
      const update = action.payload;

      // Update latest state for this device
      state.latestUpdates[update.deviceId] = update;

      // Add to history for live stream
      state.updateHistory.unshift(update);

      // Trim history to max size
      if (state.updateHistory.length > state.maxHistorySize) {
        state.updateHistory = state.updateHistory.slice(0, state.maxHistorySize);
      }
    },

    /**
     * Clear update history
     */
    clearUpdateHistory: (state) => {
      state.updateHistory = [];
    },

    /**
     * Clear latest update for a device
     */
    clearDeviceUpdate: (state, action: PayloadAction<string>) => {
      delete state.latestUpdates[action.payload];
    },

    /**
     * Clear all updates
     */
    clearAllUpdates: (state) => {
      state.latestUpdates = {};
      state.updateHistory = [];
    },

    /**
     * Reset WebSocket state
     */
    resetWebSocket: (state) => {
      return { ...initialState };
    },
  },
});

/**
 * Export actions
 */
export const {
  setConnectionStatus,
  connectionEstablished,
  connectionLost,
  connectionError,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  deviceStateUpdated,
  clearUpdateHistory,
  clearDeviceUpdate,
  clearAllUpdates,
  resetWebSocket,
} = websocketSlice.actions;

/**
 * Export reducer
 */
export default websocketSlice.reducer;

/**
 * Selectors
 */
export const selectWebSocket = (state: { websocket: WebSocketState }) =>
  state.websocket;
export const selectConnectionStatus = (state: { websocket: WebSocketState }) =>
  state.websocket.connectionStatus;
export const selectIsConnected = (state: { websocket: WebSocketState }) =>
  state.websocket.isConnected;
export const selectReconnectAttempts = (state: { websocket: WebSocketState }) =>
  state.websocket.reconnectAttempts;
export const selectWebSocketError = (state: { websocket: WebSocketState }) =>
  state.websocket.error;
export const selectLatestUpdates = (state: { websocket: WebSocketState }) =>
  state.websocket.latestUpdates;
export const selectDeviceLatestUpdate = (
  state: { websocket: WebSocketState },
  deviceId: string
) => state.websocket.latestUpdates[deviceId];
export const selectUpdateHistory = (state: { websocket: WebSocketState }) =>
  state.websocket.updateHistory;
