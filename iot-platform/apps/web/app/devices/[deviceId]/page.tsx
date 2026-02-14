'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDevice } from '@/lib/hooks/useDevices';
import { useDeviceStates, useLatestDeviceState } from '@/lib/hooks/useDeviceStates';
import { useDeviceStateUpdates } from '@/lib/hooks/useWebSocket';
import type { DeviceState } from '@/lib/types';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.deviceId as string;

  const { data: device, isLoading: deviceLoading, error: deviceError } = useDevice(deviceId);
  const { data: latestState } = useLatestDeviceState(deviceId);
  const { data: statesData, isLoading: statesLoading } = useDeviceStates(deviceId, {
    limit: 10,
  });

  const [realtimeState, setRealtimeState] = useState<DeviceState | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // WebSocket real-time updates
  const handleStateUpdate = useCallback((state: DeviceState) => {
    setRealtimeState(state);
    setUpdateCount((prev) => prev + 1);
  }, []);

  useDeviceStateUpdates(deviceId, handleStateUpdate);

  // Use real-time state if available, otherwise use latest from API
  const currentState = realtimeState || latestState;

  return (
    <ProtectedRoute>
      {deviceLoading ? (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <p className="text-gray-500">Loading device...</p>
        </div>
      ) : deviceError || !device ? (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">Device not found or error loading device.</p>
          </div>
          <button
            onClick={() => router.push('/devices')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Devices
          </button>
        </div>
      ) : (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/devices')}
            className="text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
            <p className="text-sm text-gray-500 font-mono">{device.deviceId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-600">
              Live ({updateCount} updates)
            </span>
          </div>
        </div>
      </div>

      {/* Device Info Card */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Device Information</h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{device.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Device ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{device.deviceId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tags</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {device.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(device.createdAt).toLocaleString()}
              </dd>
            </div>
            {device.attributes && Object.keys(device.attributes).length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Attributes</dt>
                <dd className="mt-1">
                  <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                    {JSON.stringify(device.attributes, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Latest State Card */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Latest State</h3>
            {currentState && (
              <span className="text-xs text-gray-500">
                {new Date(currentState.timestamp).toLocaleString()}
              </span>
            )}
          </div>

          {currentState ? (
            <div className="space-y-3">
              <pre className="text-sm text-gray-900 bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto">
                {JSON.stringify(currentState.data, null, 2)}
              </pre>
              {realtimeState && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Updated via WebSocket</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No state data available</p>
              <p className="text-sm mt-1">Send data to this device to see it here</p>
            </div>
          )}
        </div>
      </div>

      {/* State History */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">State History</h3>

          {statesLoading ? (
            <p className="text-gray-500">Loading history...</p>
          ) : statesData && statesData.data.length > 0 ? (
            <div className="space-y-3">
              {statesData.data.map((state, index) => (
                <div
                  key={state.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      #{statesData.data.length - index}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(state.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(state.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No state history available</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
        <div className="flex gap-3">
          <Link
            href="/websocket-test"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Test WebSocket →
          </Link>
          <Link
            href={`http://localhost:3001/docs#/Devices/get_devices__deviceId_`}
            target="_blank"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            API Docs →
          </Link>
        </div>
      </div>
    </div>
      )}
    </ProtectedRoute>
  );
}
