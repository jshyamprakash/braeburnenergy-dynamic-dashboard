'use client';

import { useState, useEffect } from 'react';
import { useWebSocket, useDeviceStateUpdates } from '@/lib/hooks/useWebSocket';
import { apiClient } from '@/lib/api-client';
import type { DeviceState } from '@/lib/types';

export default function WebSocketTestPage() {
  const { socket, isConnected } = useWebSocket();
  const [messages, setMessages] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [testData, setTestData] = useState('{"temperature": 25, "humidity": 60}');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Add connection status messages
  useEffect(() => {
    if (isConnected) {
      addMessage('✅ WebSocket connected!');
    } else {
      addMessage('❌ WebSocket disconnected');
    }
  }, [isConnected]);

  // Listen for pong responses
  useEffect(() => {
    if (!socket) return;

    const handlePong = (data: { timestamp: string }) => {
      addMessage(`🏓 Pong received! Server time: ${new Date(data.timestamp).toLocaleTimeString()}`);
    };

    socket.on('pong', handlePong);

    return () => {
      socket.off('pong', handlePong);
    };
  }, [socket]);

  // Listen for device state updates when subscribed
  useDeviceStateUpdates(
    isSubscribed ? deviceId : null,
    (state: DeviceState) => {
      addMessage(`📡 Received state update for ${state.deviceId}:`);
      addMessage(JSON.stringify(state.data, null, 2));
    }
  );

  const addMessage = (msg: string) => {
    setMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleSubscribe = () => {
    if (!deviceId) {
      addMessage('⚠️ Please enter a device ID first');
      return;
    }

    if (!socket) {
      addMessage('⚠️ WebSocket not connected');
      return;
    }

    if (isSubscribed) {
      // Unsubscribe
      socket.emit('unsubscribe:device', deviceId);
      setIsSubscribed(false);
      addMessage(`🔕 Unsubscribed from device: ${deviceId}`);
    } else {
      // Subscribe
      socket.emit('subscribe:device', deviceId);
      setIsSubscribed(true);
      addMessage(`🔔 Subscribed to device: ${deviceId}`);
    }
  };

  const handleSendTestData = async () => {
    if (!deviceId) {
      addMessage('⚠️ Please enter a device ID first');
      return;
    }

    try {
      const data = JSON.parse(testData);

      await apiClient.post(`/devices/${deviceId}/states`, { data });
      addMessage(`✅ Sent test data to device ${deviceId}`);
      addMessage(`Data: ${testData}`);
    } catch (error: any) {
      addMessage(`❌ Error: ${error.message || 'Failed to send data'}`);
    }
  };

  const handlePing = () => {
    if (!socket) {
      addMessage('⚠️ WebSocket not connected');
      return;
    }

    addMessage('🏓 Sending ping...');
    socket.emit('ping');
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">WebSocket Test</h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Connection Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Connection Details</h3>
        <div className="text-xs text-indigo-700 space-y-1">
          <p>WebSocket URL: ws://localhost:3001</p>
          <p>Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
          {socket && <p>Socket ID: {socket.id}</p>}
        </div>
      </div>

      {/* Test Controls */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Test Controls</h3>

        {/* Device ID Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device ID (ULID)
          </label>
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g., 01HGW5N8XZ7KQRST9VW2XY3Z4A"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Subscribe Button */}
        <div>
          <button
            onClick={handleSubscribe}
            disabled={!isConnected}
            className={`px-4 py-2 rounded-md text-white ${
              isSubscribed
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {isSubscribed ? '🔕 Unsubscribe' : '🔔 Subscribe to Device'}
          </button>
        </div>

        {/* Test Data Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Data (JSON)
          </label>
          <textarea
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSendTestData}
            disabled={!isConnected}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            📤 Send Test Data
          </button>
          <button
            onClick={handlePing}
            disabled={!isConnected}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            🏓 Ping Server
          </button>
        </div>
      </div>

      {/* Message Log */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Message Log</h3>
          <button
            onClick={clearMessages}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-900 text-green-400 rounded-md p-4 h-96 overflow-y-auto font-mono text-sm">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet. Try subscribing to a device!</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="mb-1">
                {msg}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">How to Test</h3>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Make sure the backend is running (http://localhost:3001)</li>
          <li>Check that WebSocket shows "Connected" above</li>
          <li>Enter a Device ID (create one in /devices if needed)</li>
          <li>Click "Subscribe to Device" to listen for updates</li>
          <li>Click "Send Test Data" to send data and trigger an update</li>
          <li>Watch the message log for real-time updates!</li>
        </ol>
      </div>
    </div>
  );
}
