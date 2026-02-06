'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface TimeSeriesDataPoint {
  timestamp: string | Date;
  [key: string]: any; // Allow any additional fields
}

interface TimeSeriesChartProps {
  /**
   * Time-series data points
   */
  data: TimeSeriesDataPoint[];

  /**
   * Fields to display as series
   */
  series: Array<{
    key: string;
    label: string;
    color?: string;
    unit?: string;
  }>;

  /**
   * Chart type
   */
  type?: 'line' | 'area' | 'bar';

  /**
   * Chart title
   */
  title?: string;

  /**
   * Chart height in pixels
   */
  height?: number;

  /**
   * Show grid lines
   */
  showGrid?: boolean;

  /**
   * Show legend
   */
  showLegend?: boolean;

  /**
   * Time format for X-axis
   */
  timeFormat?: 'time' | 'datetime' | 'date';

  /**
   * Y-axis label
   */
  yAxisLabel?: string;

  /**
   * Enable smooth curves (for line/area charts)
   */
  smooth?: boolean;
}

/**
 * TimeSeriesChart Component
 *
 * Displays time-series data as line, area, or bar charts.
 * Supports multiple series with different colors and units.
 *
 * Features:
 * - Multiple chart types (line, area, bar)
 * - Multi-series support
 * - Responsive design
 * - Interactive tooltips
 * - Customizable styling
 *
 * @example
 * <TimeSeriesChart
 *   data={deviceStates}
 *   series={[
 *     { key: 'temperature', label: 'Temperature', color: '#ef4444', unit: '°C' },
 *     { key: 'humidity', label: 'Humidity', color: '#3b82f6', unit: '%' }
 *   ]}
 *   type="line"
 *   title="Temperature & Humidity Trends"
 * />
 */
export function TimeSeriesChart({
  data,
  series,
  type = 'line',
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
  timeFormat = 'time',
  yAxisLabel,
  smooth = true,
}: TimeSeriesChartProps) {
  // Default colors for series
  const defaultColors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
  ];

  // Process data for chart
  const chartData = useMemo(() => {
    return data.map((point) => {
      const timestamp = new Date(point.timestamp);
      let formattedTime: string;

      switch (timeFormat) {
        case 'time':
          formattedTime = timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
          break;
        case 'date':
          formattedTime = timestamp.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          break;
        case 'datetime':
        default:
          formattedTime = timestamp.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
      }

      return {
        ...point,
        time: formattedTime,
        timestamp: timestamp.getTime(), // For sorting
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [data, timeFormat]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-xs font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          const seriesConfig = series.find((s) => s.key === entry.dataKey);
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.name}:</span>
              </div>
              <span className="font-medium text-gray-900">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                {seriesConfig?.unit && ` ${seriesConfig.unit}`}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              label={
                yAxisLabel
                  ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }
                  : undefined
              }
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {series.map((s, index) => (
              <Area
                key={s.key}
                type={smooth ? 'monotone' : 'linear'}
                dataKey={s.key}
                name={s.label}
                stroke={s.color || defaultColors[index % defaultColors.length]}
                fill={s.color || defaultColors[index % defaultColors.length]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              label={
                yAxisLabel
                  ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }
                  : undefined
              }
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {series.map((s, index) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color || defaultColors[index % defaultColors.length]}
              />
            ))}
          </BarChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              label={
                yAxisLabel
                  ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }
                  : undefined
              }
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {series.map((s, index) => (
              <Line
                key={s.key}
                type={smooth ? 'monotone' : 'linear'}
                dataKey={s.key}
                name={s.label}
                stroke={s.color || defaultColors[index % defaultColors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      {/* Header */}
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      ) : (
        <div
          className="flex items-center justify-center text-gray-500 text-sm"
          style={{ height }}
        >
          No data available
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div>
          {chartData.length} data point{chartData.length !== 1 ? 's' : ''}
        </div>
        {chartData.length > 0 && (
          <div>
            {new Date(chartData[0].timestamp).toLocaleString()} -{' '}
            {new Date(chartData[chartData.length - 1].timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
