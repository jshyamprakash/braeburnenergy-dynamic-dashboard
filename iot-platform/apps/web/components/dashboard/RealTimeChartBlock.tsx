'use client';

import { TimeSeriesChart } from '../blocks/TimeSeriesChart';
import { useDeviceStates, useDeviceFields, computeTimeRange } from '@/hooks/useDeviceData';
import { useMemo, useState } from 'react';

interface RealTimeChartBlockProps {
  deviceId?: string;
  field?: string; // If provided, show only this field in the series
  title?: string;
  chartType?: 'line' | 'area' | 'bar';
  showLegend?: boolean;
  showGrid?: boolean;
  smooth?: boolean;
  data?: any[]; // Fallback mock data
  series?: any[]; // Fallback mock series
}

/**
 * RealTimeChartBlock
 *
 * Wrapper around TimeSeriesChart that fetches historical data from a device
 */
export function RealTimeChartBlock({
  deviceId,
  field,
  data: fallbackData = [],
  series: fallbackSeries = [],
  chartType = 'line',
  title,
  showLegend,
  showGrid,
  smooth,
}: RealTimeChartBlockProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const { startTime, endTime } = computeTimeRange(timeRange);
  const { data: deviceStates = [] } = useDeviceStates(deviceId, { limit: 200, startTime, endTime });
  const fields = useDeviceFields(deviceId);

  // Transform device states into chart data format
  const chartData = useMemo(() => {
    if (!deviceId || deviceStates.length === 0) {
      return fallbackData;
    }

    // ADR-028: merge derived over data so workflow-computed values take precedence per field
    return deviceStates.map((state) => ({
      timestamp: state.timestamp,
      ...state.data,
      ...(state.derived ?? {}),
    }));
  }, [deviceId, deviceStates, fallbackData]);

  // Auto-generate series from available fields
  const chartSeries = useMemo(() => {
    if (!deviceId || fields.length === 0) {
      return fallbackSeries;
    }

    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    let fieldsToShow = fields;

    // If field is specified, show only that field
    if (field) {
      fieldsToShow = fields.filter(f => f.key === field);
    }

    return fieldsToShow.map((entry, index) => ({
      key: entry.key,
      label: entry.key.charAt(0).toUpperCase() + entry.key.slice(1).replace(/_/g, ' '),
      color: colors[index % colors.length],
    }));
  }, [deviceId, fields, field, fallbackSeries]);

  return (
    <div className="flex flex-col gap-3">
      {/* Time range tabs */}
      <div className="flex gap-2">
        {(['1h', '6h', '24h'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      <TimeSeriesChart
        type={chartType}
        title={title}
        showLegend={showLegend}
        showGrid={showGrid}
        smooth={smooth}
        data={chartData}
        series={chartSeries}
        hideExport={true}
      />
    </div>
  );
}
