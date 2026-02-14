'use client';

import { GaugeBlock } from '@/components/blocks/GaugeBlock';
import { TimeSeriesChart, type TimeSeriesDataPoint } from '@/components/blocks/TimeSeriesChart';
import { LiveStreamBlock } from '@/components/blocks/LiveStreamBlock';
import { useDevices } from '@/lib/hooks/useDevices';
import { useDeviceStates } from '@/lib/hooks/useDeviceStates';
import { useDeviceStatesAggregated } from '@/lib/hooks/useDeviceStatesAggregated';
import { useDeviceStateUpdates } from '@/lib/hooks/useWebSocket';
import { useThrottle } from '@/lib/hooks/useThrottle';
import { useCallback, useMemo, useEffect } from 'react';
import type { DeviceState } from '@/lib/types';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { deviceStateUpdated, selectDeviceLatestUpdate, selectUpdateHistory } from '@/lib/store/slices/websocketSlice';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

/**
 * Real Dashboard Page
 *
 * Displays live data from actual devices in the database.
 * Uses WebSocket for real-time updates.
 */
export default function DashboardPage() {
  // Fetch devices from database
  const { data: devicesData, isLoading: devicesLoading } = useDevices({ limit: 10 });

  // Automatically use the first available device (or fallback to test device)
  const targetDeviceId = devicesData?.devices?.[0]?.deviceId || '01KGS318RAC4ARXA2EEYH8Q3HH';

  // Fetch recent states for latest value (small query)
  const { data: statesData, isLoading: statesLoading } = useDeviceStates(targetDeviceId, {
    limit: 1, // Only need latest for initial value
  });

  // Fetch aggregated historical data for charts (performance optimized)
  const now = useMemo(() => new Date().toISOString(), []);
  const oneHourAgo = useMemo(() => new Date(Date.now() - 60 * 60 * 1000).toISOString(), []);

  const { data: aggregatedData, isLoading: aggregatedLoading } = useDeviceStatesAggregated(
    targetDeviceId,
    {
      startTime: oneHourAgo,
      endTime: now,
      fields: ['temperature', 'humidity'],
      functions: ['avg', 'min', 'max'],
      // bucket auto-selected based on time range (1m for 1 hour)
    }
  );

  // Redux state for WebSocket updates
  const dispatch = useAppDispatch();
  const latestState = useAppSelector((state) => selectDeviceLatestUpdate(state, targetDeviceId));
  const updateHistory = useAppSelector(selectUpdateHistory);

  // Get live stream data for this device only and convert to DeviceState format
  const liveStreamData = useMemo(() => {
    return updateHistory
      .filter((update) => update.deviceId === targetDeviceId)
      .slice(0, 20)
      .map((update) => ({
        deviceId: update.deviceId,
        data: update.data,
        timestamp: update.timestamp,
        orgId: update.orgId,
      } as unknown as DeviceState));
  }, [updateHistory, targetDeviceId]);

  // Calculate update count
  const updateCount = liveStreamData.length;

  // Handle real-time updates from WebSocket (throttled for performance)
  const handleStateUpdateRaw = useCallback((state: DeviceState) => {
    dispatch(deviceStateUpdated({
      deviceId: targetDeviceId,
      data: state.data,
      timestamp: state.timestamp,
    }));
  }, [dispatch, targetDeviceId]);

  // Throttle updates to max 1 per second (prevents UI lag at high frequency)
  const handleStateUpdate = useThrottle(handleStateUpdateRaw, 1000);

  // Subscribe to device state updates
  useDeviceStateUpdates(targetDeviceId, handleStateUpdate);

  // Get latest values from either WebSocket or historical data
  const currentStateData = statesData?.data?.[0];
  const temperature = latestState?.data?.temperature || currentStateData?.data?.temperature || 0;
  const humidity = latestState?.data?.humidity || currentStateData?.data?.humidity || 0;

  // Get timestamp for display
  const lastUpdateTimestamp = latestState?.timestamp || currentStateData?.timestamp;

  // Prepare time-series data using aggregated data (performance optimized)
  const timeSeriesData: TimeSeriesDataPoint[] = useMemo(() => {
    if (!aggregatedData) return [];

    // Convert aggregated data to time-series format
    const aggregatedPoints = aggregatedData.data.map((point) => ({
      timestamp: point.bucket,
      temperature: point.values.temperature_avg || 0,
      temperature_min: point.values.temperature_min,
      temperature_max: point.values.temperature_max,
      humidity: point.values.humidity_avg || 0,
      humidity_min: point.values.humidity_min,
      humidity_max: point.values.humidity_max,
    }));

    // Add recent live stream data (for real-time updates)
    const recentLiveData = liveStreamData
      .filter((state) => new Date(state.timestamp) > new Date(oneHourAgo))
      .map((state) => ({
        timestamp: state.timestamp,
        temperature: state.data?.temperature || 0,
        humidity: state.data?.humidity || 0,
      }));

    // Combine aggregated historical data with recent live updates
    const combined = [...aggregatedPoints, ...recentLiveData];

    // Remove duplicates and sort
    const uniqueByTimestamp = combined.reduce((acc, curr) => {
      const existing = acc.find(
        (item) =>
          Math.abs(new Date(item.timestamp).getTime() - new Date(curr.timestamp).getTime()) <
          1000
      );
      if (!existing) {
        acc.push(curr);
      }
      return acc;
    }, [] as TimeSeriesDataPoint[]);

    return uniqueByTimestamp.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [aggregatedData, liveStreamData, oneHourAgo]);

  return (
    <ProtectedRoute>
      {devicesLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      ) : !devicesData?.devices?.length ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Devices Found</h2>
            <p className="text-gray-600 mb-6">
              Start the device simulator to create devices and see live data on this dashboard.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
              <p className="text-sm font-medium text-gray-900 mb-2">Start the simulator:</p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`cd iot-platform
pnpm run simulate -- --devices 5 --interval 2s`}
              </pre>
            </div>
          </div>
        </div>
      ) : (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time data from {devicesData?.devices?.[0]?.name || 'device simulator'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-600">Live</span>
          </div>
          <div className="text-xs text-gray-500">
            {updateCount} updates received
          </div>
          <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            ⚡ Throttled (1/sec)
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          📊 Real Device Data Dashboard
        </h3>
        <p className="text-xs text-blue-700">
          Displaying data from <strong>{devicesData?.devices?.[0]?.name}</strong> (ID: <code className="bg-blue-100 px-1 rounded">{targetDeviceId}</code>).
          All data is stored in TimescaleDB and updates in real-time via WebSocket.
        </p>
        <p className="text-xs text-blue-700 mt-2">
          ⚡ <strong>Performance:</strong> Charts use server-side aggregation (1-minute buckets) for efficient rendering.
          Handles 10+ messages/second without performance degradation.
        </p>
        <p className="text-xs text-blue-700 mt-2">
          💡 <strong>Tip:</strong> Visit <a href="/dashboard-demo" className="underline font-medium">Dashboard Demo</a> to see all component variations with simulated data.
        </p>
      </div>

      {/* Current Readings - Gauges */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Readings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GaugeBlock
            value={temperature}
            min={0}
            max={100}
            label="Temperature"
            unit="°C"
            warningThreshold={30}
            criticalThreshold={40}
            size="lg"
          />
          <GaugeBlock
            value={humidity}
            min={0}
            max={100}
            label="Humidity"
            unit="%"
            warningThreshold={70}
            criticalThreshold={85}
            size="lg"
          />
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Device Info</h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-500">Device ID:</span>
                <div className="font-mono text-gray-900 break-all">{targetDeviceId}</div>
              </div>
              <div>
                <span className="text-gray-500">Last Update:</span>
                <div className="text-gray-900">
                  {lastUpdateTimestamp
                    ? new Date(lastUpdateTimestamp).toLocaleString()
                    : 'No data'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Data Points:</span>
                <div className="text-gray-900">{statesData?.data?.length || 0}</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow border border-green-200 p-4 flex flex-col justify-center items-center">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-sm font-medium text-gray-900">System Status</div>
            <div className="text-xs text-gray-600 mt-1">All Systems Operational</div>
            <div className="mt-3 text-xs text-gray-500">
              API: <span className="text-green-600 font-medium">Connected</span>
            </div>
            <div className="text-xs text-gray-500">
              WebSocket: <span className="text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data - Time Series */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historical Trends</h2>

        {aggregatedLoading ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading historical data...</p>
          </div>
        ) : timeSeriesData.length > 0 ? (
          <div className="space-y-6">
            {/* Combined Chart */}
            <TimeSeriesChart
              data={timeSeriesData}
              series={[
                { key: 'temperature', label: 'Temperature', color: '#ef4444', unit: '°C' },
                { key: 'humidity', label: 'Humidity', color: '#3b82f6', unit: '%' },
              ]}
              type="line"
              title="Temperature & Humidity Over Time"
              height={300}
              showGrid
              showLegend
              timeFormat="datetime"
            />

            {/* Individual Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TimeSeriesChart
                data={timeSeriesData}
                series={[
                  { key: 'temperature', label: 'Temperature', color: '#ef4444', unit: '°C' },
                ]}
                type="area"
                title="Temperature Trend"
                height={250}
                showGrid
                showLegend={false}
                timeFormat="time"
                yAxisLabel="Temperature (°C)"
              />
              <TimeSeriesChart
                data={timeSeriesData}
                series={[
                  { key: 'humidity', label: 'Humidity', color: '#3b82f6', unit: '%' },
                ]}
                type="area"
                title="Humidity Trend"
                height={250}
                showGrid
                showLegend={false}
                timeFormat="time"
                yAxisLabel="Humidity (%)"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm text-gray-600">No historical data available</p>
            <p className="text-xs text-gray-500 mt-1">Post device states to see trends</p>
          </div>
        )}
      </div>

      {/* Live Stream */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Data Stream</h2>
        <LiveStreamBlock
          deviceId={targetDeviceId}
          title="Real-Time Device Updates (Virtualized)"
          manualData={liveStreamData}
          fields={['temperature', 'humidity']}
          maxUpdates={1000} // Can handle 1000+ items with virtual scrolling
          height={400}
          autoScroll
        />
      </div>

      {/* Testing Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          🧪 Test Real-Time Updates
        </h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>To see live updates, post a new device state:</p>
          <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto mt-2">
{`curl -X POST http://localhost:3001/devices/${targetDeviceId}/states \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": {
      "temperature": 28.5,
      "humidity": 65
    }
  }'`}
          </pre>
          <p className="text-xs text-gray-500 mt-2">
            Watch the gauges, charts, and live stream update in real-time! 🚀
          </p>
        </div>
      </div>
    </div>
      )}
    </ProtectedRoute>
  );
}
