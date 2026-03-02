'use client';

import { TimeSeriesChart } from '../blocks/TimeSeriesChart';
import { useDeviceRealtime, useDeviceFields, useDeviceDerivedHistory } from '@/hooks/useDeviceData';
import { useMemo, useRef, useState, useEffect } from 'react';

interface RealTimeChartBlockProps {
  deviceId?: string;
  field?: string; // If provided, show only this field in the series
  title?: string;
  chartType?: 'line' | 'area' | 'bar';
  showLegend?: boolean;
  showGrid?: boolean;
  smooth?: boolean;
  /** Rolling window size — buffer capped at this many data points (default 50) */
  limit?: number;
  data?: any[]; // Fallback mock data
  series?: any[]; // Fallback mock series
}

/**
 * RealTimeChartBlock
 *
 * Accumulates real-time WebSocket derived state updates into a rolling buffer
 * and renders them as a time-series chart.
 *
 * NOTE: device_states collection never has a `derived` field — derived state
 * is stored only in device_derived_states (ADR-030/031). There is no historical
 * derived data available; the chart shows data only from the current session.
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
  limit = 50,
}: RealTimeChartBlockProps) {
  const { state: latestState } = useDeviceRealtime(deviceId);
  const fields = useDeviceFields(deviceId);

  // Rolling buffer of derived data points accumulated from WebSocket updates
  const [chartPoints, setChartPoints] = useState<Array<{ timestamp: string | Date; [key: string]: any }>>([]);
  const prevTimestampRef = useRef<string | Date | null>(null);

  // Fetch N historical derived points — shared React Query cache with LiveStreamBlock
  const { data: historyRecords = [] } = useDeviceDerivedHistory(deviceId, limit);

  // Stable content-derived key: avoids infinite loops caused by the default `[]` fallback
  // creating a new array reference on every render (which would re-trigger the effect endlessly).
  const historySeedKey = `${deviceId}-${historyRecords.length}-${historyRecords[0]?.timestamp ?? ''}`;

  // Reset and seed chart from history when device or history batch changes.
  // historyRecords arrive newest-first; chart needs oldest→newest so we reverse.
  useEffect(() => {
    prevTimestampRef.current = null;
    if (historyRecords.length === 0) {
      setChartPoints([]);
      return;
    }
    const points = [...historyRecords].reverse().map((r) => ({
      timestamp: new Date(r.timestamp).toISOString(),
      ...r.derived,
    }));
    setChartPoints(points);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historySeedKey]);

  // Append new derived data point when latestState changes and has derived values
  useEffect(() => {
    if (!latestState || !latestState.derived || Object.keys(latestState.derived).length === 0) return;
    if (latestState.timestamp === prevTimestampRef.current) return;
    prevTimestampRef.current = latestState.timestamp;

    const point = { timestamp: latestState.timestamp, ...latestState.derived };
    setChartPoints((prev) => {
      const next = [...prev, point];
      return next.length > limit ? next.slice(next.length - limit) : next;
    });
  }, [latestState, limit]);

  const chartData = chartPoints.length > 0 ? chartPoints : fallbackData;

  // Auto-generate series from derived fields only, but fall back to inferring from actual data
  const chartSeries = useMemo(() => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    let series: Array<{ key: string; label: string; color: string }> = [];

    if (deviceId && fields.length > 0) {
      let fieldsToShow = fields;
      if (field) {
        fieldsToShow = fields.filter(f => f.key === field);
      }
      series = fieldsToShow.map((entry, index) => ({
        key: entry.key,
        label: entry.key.charAt(0).toUpperCase() + entry.key.slice(1).replace(/_/g, ' '),
        color: colors[index % colors.length],
      }));
    }

    // If no fields discovered, infer from the actual data points
    if (series.length === 0 && chartData.length > 0) {
      const keys = Object.keys(chartData[0]).filter(
        k => k !== 'timestamp' && k !== 'time' && k !== '_sortKey'
      );
      series = keys.map((k, idx) => ({
        key: k,
        label: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '),
        color: colors[idx % colors.length],
      }));
    }

    // Fallback to provided series config
    if (series.length === 0 && fallbackSeries.length > 0) {
      return fallbackSeries;
    }

    return series;
  }, [deviceId, fields, field, fallbackSeries, chartData]);
  return (
    <div className="flex flex-col gap-3">
      {/* Live indicator */}
      {deviceId && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className={`w-2 h-2 rounded-full ${chartPoints.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>
            {chartPoints.length > 0
              ? `Live · ${chartPoints.length}/${limit} point${chartPoints.length !== 1 ? 's' : ''}`
              : 'Waiting for derived data…'}
          </span>
        </div>
      )}

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
