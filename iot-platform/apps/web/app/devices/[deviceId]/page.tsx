'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDevice } from '@/lib/hooks/useDevices';
import { useDeviceStates, useLatestDeviceState } from '@/lib/hooks/useDeviceStates';
import { useDeviceStateUpdates } from '@/lib/hooks/useWebSocket';
import type { DeviceState, Device } from '@/lib/types';
import { toast } from 'sonner';
import { Copy, ArrowLeft, Activity } from 'lucide-react';

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.deviceId as string;

  const { data: device, isLoading: deviceLoading, error: deviceError } = useDevice(deviceId);
  const { data: latestState } = useLatestDeviceState(deviceId);
  const { data: statesData, isLoading: statesLoading } = useDeviceStates(deviceId, { limit: 10 });

  const [realtimeState, setRealtimeState] = useState<DeviceState | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const handleStateUpdate = useCallback((state: DeviceState) => {
    setRealtimeState(state);
    setUpdateCount((prev) => prev + 1);
  }, []);

  useDeviceStateUpdates(deviceId, handleStateUpdate);

  const currentState = realtimeState || latestState;

  const isDeviceOnline = (d: Device): boolean => {
    if (!d.lastSeenAt) return false;
    return Date.now() - new Date(d.lastSeenAt).getTime() < 5 * 60 * 1000;
  };

  const formatLastSeen = (d: Device): string => {
    if (!d.lastSeenAt) return 'Never';
    return new Date(d.lastSeenAt).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  if (deviceLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-400 dark:text-slate-500">Loading device…</p>
      </div>
    );
  }

  if (deviceError || !device) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-6">
          <p className="text-rose-600 dark:text-rose-400">Device not found or error loading device.</p>
        </div>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          <ArrowLeft className="w-4 h-4" /> Back to Devices
        </button>
      </div>
    );
  }

  const online = isDeviceOnline(device);
  const simCommand = `pnpm run simulate -- --deviceId ${device.deviceId} --interval 2s`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => router.back()} className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{device.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">{device.deviceId}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(device.deviceId); toast.success('Device ID copied'); }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  title="Copy device ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  online
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {online ? 'Online' : 'Offline'}
                </span>
                {device.dataSource && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    device.dataSource === 'gateway' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' :
                    device.dataSource === 'workflow' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}>
                    {device.dataSource}
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">Last seen: {formatLastSeen(device)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>{updateCount} live updates</span>
          </div>
        </div>
      </div>

      {/* Device Info + Simulator row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device Information */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Device Information</h3>
          <dl className="space-y-3">
            <div className="flex items-start gap-2">
              <dt className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">Name</dt>
              <dd className="text-sm text-slate-900 dark:text-slate-100">{device.name}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">Device ID</dt>
              <dd className="text-sm font-mono text-slate-600 dark:text-slate-400 break-all">{device.deviceId}</dd>
            </div>
            {device.tags && Object.keys(device.tags).length > 0 && (
              <div className="flex items-start gap-2">
                <dt className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {Object.entries(device.tags).map(([key, value]) => (
                    <span key={key} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded text-xs">
                      {value ? `${key}: ${value}` : key}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            <div className="flex items-start gap-2">
              <dt className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">Created</dt>
              <dd className="text-sm text-slate-600 dark:text-slate-400">{new Date(device.createdAt).toLocaleString()}</dd>
            </div>
            {device.attributes && Object.keys(device.attributes).length > 0 && (
              <div>
                <dt className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Attributes</dt>
                <pre className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
                  {JSON.stringify(device.attributes, null, 2)}
                </pre>
              </div>
            )}
          </dl>
        </div>

        {/* Simulator Command */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Stream Data to Device</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Run this command to stream simulated data:</p>
          <div className="flex items-center gap-2">
            <pre className="flex-1 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg p-3 overflow-x-auto">
              {simCommand}
            </pre>
            <button
              onClick={() => { navigator.clipboard.writeText(simCommand); toast.success('Command copied'); }}
              className="flex-shrink-0 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
              title="Copy command"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-4">
            <Link href="/websocket-test" className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">
              Test WebSocket →
            </Link>
            <Link href={`http://localhost:3001/docs#/Devices/get_devices__deviceId_`} target="_blank" className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">
              API Docs →
            </Link>
          </div>
        </div>
      </div>

      {/* Latest State */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Latest State</h3>
          <div className="flex items-center gap-3">
            {realtimeState && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
            {currentState && (
              <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {new Date(currentState.timestamp).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        {currentState ? (
          <pre className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
            {JSON.stringify(currentState.data, null, 2)}
          </pre>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <p className="text-sm">No state data available</p>
            <p className="text-xs mt-1">Send data to this device to see it here</p>
          </div>
        )}
      </div>

      {/* State History */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">State History</h3>
        {statesLoading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading history…</p>
        ) : statesData && statesData.data.length > 0 ? (
          <div className="space-y-2">
            {statesData.data.map((state, index) => (
              <div key={state.id} className="rounded-lg border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 p-3 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                    #{statesData.data.length - index}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                    {new Date(state.timestamp).toLocaleString()}
                  </span>
                </div>
                <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded overflow-x-auto">
                  {JSON.stringify(state.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <p className="text-sm">No state history available</p>
          </div>
        )}
      </div>
    </div>
  );
}
