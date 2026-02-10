'use client';

import { TimeSeriesChart } from '../blocks/TimeSeriesChart';
import { useDeviceStates, useDeviceFields } from '@/hooks/useDeviceData';
import { useMemo } from 'react';

interface RealTimeChartBlockProps {
  deviceId?: string;
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
  data: fallbackData = [],
  series: fallbackSeries = [],
  chartType = 'line',
  title,
  showLegend,
  showGrid,
  smooth,
}: RealTimeChartBlockProps) {
  const { data: deviceStates = [] } = useDeviceStates(deviceId, { limit: 50 });
  const fields = useDeviceFields(deviceId);

  // Transform device states into chart data format
  const chartData = useMemo(() => {
    if (!deviceId || deviceStates.length === 0) {
      return fallbackData;
    }

    return deviceStates.map((state) => ({
      timestamp: state.timestamp,
      ...state.data,
    }));
  }, [deviceId, deviceStates, fallbackData]);

  // Auto-generate series from available fields
  const chartSeries = useMemo(() => {
    if (!deviceId || fields.length === 0) {
      return fallbackSeries;
    }

    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    return fields.map((field, index) => ({
      key: field,
      label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
      color: colors[index % colors.length],
    }));
  }, [deviceId, fields, fallbackSeries]);

  return (
    <TimeSeriesChart
      type={chartType} // Map chartType to type prop
      title={title}
      showLegend={showLegend}
      showGrid={showGrid}
      smooth={smooth}
      data={chartData}
      series={chartSeries}
      hideExport={true}
    />
  );
}
