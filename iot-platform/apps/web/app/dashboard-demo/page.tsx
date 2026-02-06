'use client';

import { useState, useEffect, useMemo } from 'react';
import { GaugeBlock } from '@/components/blocks/GaugeBlock';
import { TimeSeriesChart, type TimeSeriesDataPoint } from '@/components/blocks/TimeSeriesChart';
import { LiveStreamBlock } from '@/components/blocks/LiveStreamBlock';
import type { DeviceState } from '@/lib/types';

export default function DashboardDemoPage() {
  // Simulate real-time data updates
  const [temperature, setTemperature] = useState(75);
  const [pressure, setPressure] = useState(45);
  const [humidity, setHumidity] = useState(62);
  const [speed, setSpeed] = useState(1850);

  // Historical data storage (keep last 20 points)
  const [historicalData, setHistoricalData] = useState<TimeSeriesDataPoint[]>([]);

  // Live stream data
  const [liveStreamData, setLiveStreamData] = useState<DeviceState[]>([]);

  // Simulate data updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Temperature oscillates between 70-95°C
      setTemperature((prev) => {
        const change = (Math.random() - 0.5) * 3;
        return Math.max(70, Math.min(95, prev + change));
      });

      // Pressure oscillates between 30-60 PSI
      setPressure((prev) => {
        const change = (Math.random() - 0.5) * 2;
        return Math.max(30, Math.min(60, prev + change));
      });

      // Humidity oscillates between 40-80%
      setHumidity((prev) => {
        const change = (Math.random() - 0.5) * 2.5;
        return Math.max(40, Math.min(80, prev + change));
      });

      // Speed oscillates between 1500-2200 RPM
      setSpeed((prev) => {
        const change = (Math.random() - 0.5) * 50;
        return Math.max(1500, Math.min(2200, prev + change));
      });

      // Add to historical data (keep last 20 points)
      setHistoricalData((prev) => {
        const newPoint: TimeSeriesDataPoint = {
          timestamp: new Date().toISOString(),
          temperature: temperature,
          pressure: pressure,
          humidity: humidity,
          speed: speed,
        };
        const updated = [...prev, newPoint];
        return updated.slice(-20); // Keep only last 20 points
      });

      // Add to live stream data
      setLiveStreamData((prev) => {
        const newState: DeviceState = {
          id: `sim-${Date.now()}`,
          deviceId: 'demo-device-001',
          timestamp: new Date().toISOString(),
          data: {
            temperature: temperature,
            pressure: pressure,
            humidity: humidity,
            speed: speed,
          },
        };
        return [newState, ...prev];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [temperature, pressure, humidity, speed]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Demo</h1>
          <p className="text-sm text-gray-600 mt-1">
            Live gauge blocks with simulated real-time data updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-600">Live Updates</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Dashboard Blocks</h3>
        <p className="text-xs text-blue-700">
          These gauge blocks visualize real-time sensor data with color-coded thresholds.
          Data updates every 2 seconds to simulate live IoT device feeds.
        </p>
      </div>

      {/* Large Gauges Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Large Gauges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GaugeBlock
            value={temperature}
            min={0}
            max={100}
            label="Temperature"
            unit="°C"
            warningThreshold={80}
            criticalThreshold={90}
            size="lg"
          />
          <GaugeBlock
            value={pressure}
            min={0}
            max={100}
            label="Pressure"
            unit=" PSI"
            warningThreshold={55}
            criticalThreshold={70}
            size="lg"
          />
          <GaugeBlock
            value={humidity}
            min={0}
            max={100}
            label="Humidity"
            unit="%"
            warningThreshold={75}
            criticalThreshold={85}
            size="lg"
          />
          <GaugeBlock
            value={speed}
            min={0}
            max={3000}
            label="Motor Speed"
            unit=" RPM"
            warningThreshold={2000}
            criticalThreshold={2500}
            size="lg"
          />
        </div>
      </div>

      {/* Medium Gauges Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Medium Gauges</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <GaugeBlock
            value={temperature}
            min={0}
            max={100}
            label="Temp"
            unit="°C"
            warningThreshold={80}
            criticalThreshold={90}
            size="md"
          />
          <GaugeBlock
            value={pressure}
            min={0}
            max={100}
            label="Pressure"
            unit=" PSI"
            warningThreshold={55}
            criticalThreshold={70}
            size="md"
          />
          <GaugeBlock
            value={humidity}
            min={0}
            max={100}
            label="Humidity"
            unit="%"
            warningThreshold={75}
            criticalThreshold={85}
            size="md"
          />
          <GaugeBlock
            value={speed}
            min={0}
            max={3000}
            label="Speed"
            unit=" RPM"
            warningThreshold={2000}
            criticalThreshold={2500}
            size="md"
          />
          <GaugeBlock
            value={85}
            min={0}
            max={100}
            label="CPU Usage"
            unit="%"
            warningThreshold={70}
            criticalThreshold={90}
            size="md"
          />
          <GaugeBlock
            value={3.8}
            min={0}
            max={5}
            label="Voltage"
            unit="V"
            size="md"
          />
        </div>
      </div>

      {/* Small Gauges Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Small Gauges</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <GaugeBlock
            value={temperature}
            min={0}
            max={100}
            unit="°C"
            warningThreshold={80}
            criticalThreshold={90}
            size="sm"
          />
          <GaugeBlock
            value={pressure}
            min={0}
            max={100}
            unit="PSI"
            warningThreshold={55}
            criticalThreshold={70}
            size="sm"
          />
          <GaugeBlock
            value={humidity}
            min={0}
            max={100}
            unit="%"
            warningThreshold={75}
            criticalThreshold={85}
            size="sm"
          />
          <GaugeBlock
            value={speed}
            min={0}
            max={3000}
            unit="RPM"
            warningThreshold={2000}
            criticalThreshold={2500}
            size="sm"
          />
          <GaugeBlock
            value={92}
            min={0}
            max={100}
            unit="%"
            criticalThreshold={95}
            size="sm"
          />
          <GaugeBlock
            value={45}
            min={0}
            max={100}
            unit="%"
            size="sm"
          />
          <GaugeBlock
            value={68}
            min={0}
            max={100}
            unit="%"
            warningThreshold={80}
            size="sm"
          />
          <GaugeBlock
            value={23}
            min={0}
            max={100}
            unit="%"
            size="sm"
          />
        </div>
      </div>

      {/* Threshold States Examples */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Threshold States</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Normal State</h3>
            <GaugeBlock
              value={45}
              min={0}
              max={100}
              label="Within Range"
              unit="°C"
              warningThreshold={80}
              criticalThreshold={95}
              size="lg"
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Warning State</h3>
            <GaugeBlock
              value={85}
              min={0}
              max={100}
              label="Approaching Limit"
              unit="°C"
              warningThreshold={80}
              criticalThreshold={95}
              size="lg"
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Critical State</h3>
            <GaugeBlock
              value={98}
              min={0}
              max={100}
              label="Exceeded Limit"
              unit="°C"
              warningThreshold={80}
              criticalThreshold={95}
              size="lg"
            />
          </div>
        </div>
      </div>

      {/* Live Stream Blocks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Data Stream</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* All fields live stream */}
          <LiveStreamBlock
            title="All Sensors - Live Feed"
            manualData={liveStreamData}
            maxUpdates={20}
            height={400}
            autoScroll
          />

          {/* Filtered fields live stream */}
          <LiveStreamBlock
            title="Temperature & Humidity Only"
            manualData={liveStreamData}
            fields={['temperature', 'humidity']}
            maxUpdates={15}
            height={400}
            autoScroll
          />
        </div>
      </div>

      {/* Time-Series Charts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Time-Series Charts</h2>

        {/* Line Chart - Multi-series */}
        <div className="mb-6">
          <TimeSeriesChart
            data={historicalData}
            series={[
              { key: 'temperature', label: 'Temperature', color: '#ef4444', unit: '°C' },
              { key: 'humidity', label: 'Humidity', color: '#3b82f6', unit: '%' },
            ]}
            type="line"
            title="Temperature & Humidity Trends (Last 40 seconds)"
            height={300}
            showGrid
            showLegend
            timeFormat="time"
          />
        </div>

        {/* Area Chart */}
        <div className="mb-6">
          <TimeSeriesChart
            data={historicalData}
            series={[
              { key: 'pressure', label: 'Pressure', color: '#8b5cf6', unit: ' PSI' },
            ]}
            type="area"
            title="Pressure Over Time"
            height={250}
            showGrid
            showLegend
            timeFormat="time"
            yAxisLabel="Pressure (PSI)"
          />
        </div>

        {/* Bar Chart */}
        <div className="mb-6">
          <TimeSeriesChart
            data={historicalData}
            series={[
              { key: 'speed', label: 'Motor Speed', color: '#10b981', unit: ' RPM' },
            ]}
            type="bar"
            title="Motor Speed Histogram"
            height={250}
            showGrid
            showLegend={false}
            timeFormat="time"
          />
        </div>

        {/* Multi-series comparison */}
        <div>
          <TimeSeriesChart
            data={historicalData}
            series={[
              { key: 'temperature', label: 'Temperature', color: '#ef4444', unit: '°C' },
              { key: 'pressure', label: 'Pressure', color: '#8b5cf6', unit: ' PSI' },
              { key: 'humidity', label: 'Humidity', color: '#3b82f6', unit: '%' },
            ]}
            type="line"
            title="All Sensors - Multi-Series Comparison"
            height={350}
            showGrid
            showLegend
            timeFormat="time"
          />
        </div>
      </div>

      {/* Real Device Integration Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Real Device Integration (Coming Soon)
        </h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            These gauge blocks can be connected to real device data in the next tasks:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Bind to device state fields (e.g., device.data.temperature)</li>
            <li>Receive WebSocket updates for real-time refresh</li>
            <li>Configure thresholds per device type</li>
            <li>Support multiple data sources per dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
