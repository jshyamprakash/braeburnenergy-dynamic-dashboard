'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { downsampleLTTB, getOptimalThreshold } from '@/lib/utils/downsample';
import {
  exportTimeSeriesDataToCSV,
  exportChartAsPNG,
  exportChartAsSVG,
} from '@/lib/utils/export';
import { toast } from '@/lib/utils/toast';
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

  /**
   * Hide export button
   */
  hideExport?: boolean;
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
  hideExport = false,
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

  // Track chart container width for optimal downsampling
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800); // Default width
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setChartWidth(width);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Export handlers
  const handleExportCSV = () => {
    try {
      exportTimeSeriesDataToCSV(data, title);
      toast.success('CSV exported successfully');
      setShowExportMenu(false);
    } catch (error) {
      toast.error(error, 'Failed to export CSV');
    }
  };

  const handleExportPNG = async () => {
    try {
      const svgElement = chartRef.current?.querySelector('svg');
      if (!svgElement) {
        throw new Error('Chart not found');
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const titleSlug = title
        ? title.toLowerCase().replace(/\s+/g, '_')
        : 'chart';
      const filename = `${titleSlug}_${dateStr}.png`;

      await exportChartAsPNG(svgElement, filename);
      toast.success('Chart exported as PNG');
      setShowExportMenu(false);
    } catch (error) {
      toast.error(error, 'Failed to export PNG');
    }
  };

  const handleExportSVG = () => {
    try {
      const svgElement = chartRef.current?.querySelector('svg');
      if (!svgElement) {
        throw new Error('Chart not found');
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const titleSlug = title
        ? title.toLowerCase().replace(/\s+/g, '_')
        : 'chart';
      const filename = `${titleSlug}_${dateStr}.svg`;

      exportChartAsSVG(svgElement, filename);
      toast.success('Chart exported as SVG');
      setShowExportMenu(false);
    } catch (error) {
      toast.error(error, 'Failed to export SVG');
    }
  };

  // Process data for chart with intelligent downsampling
  const chartData = useMemo(() => {
    console.log('[TimeSeriesChart] Raw data:', data.length, 'points', data[0]);

    // Convert to chart format
    const formattedData = data.map((point) => {
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
        timestamp: point.timestamp, // Keep original timestamp
        _sortKey: timestamp.getTime(), // For sorting
      };
    }).sort((a, b) => (a._sortKey as number) - (b._sortKey as number));

    // Apply LTTB downsampling for better performance
    const threshold = getOptimalThreshold(chartWidth, formattedData.length);

    if (formattedData.length > threshold) {
      // Use first series key for downsampling calculation
      const firstSeriesKey = series[0]?.key as any;
      const downsampled = downsampleLTTB(formattedData, threshold, firstSeriesKey);

      console.log(
        `[TimeSeriesChart] Downsampled ${formattedData.length} → ${downsampled.length} points (${Math.round((1 - downsampled.length / formattedData.length) * 100)}% reduction)`
      );

      return downsampled;
    }

    console.log('[TimeSeriesChart] Chart data:', formattedData.length, 'points', formattedData[0]);
    return formattedData;
  }, [data, timeFormat, chartWidth, series]);

  // Derive effective series list (fall back on data keys if the caller didn't
  // supply any). This makes the component more forgiving when used directly
  // (e.g. via playground or dashboard config with no explicit series).
  const effectiveSeries = useMemo(() => {
    if (series && series.length > 0) return series;
    if (chartData.length > 0) {
      // pick all numeric/visible keys except internal helpers
      const keys = Object.keys(chartData[0]).filter(
        k => k !== 'timestamp' && k !== 'time' && k !== '_sortKey'
      );
      return keys.map((key, idx) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        color: defaultColors[idx % defaultColors.length],
      }));
    }
    return [];
  }, [series, chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          const seriesConfig = series.find((s) => s.key === entry.dataKey);
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
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
            {effectiveSeries.map((s, index) => (
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
            {effectiveSeries.map((s, index) => (
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
            {effectiveSeries.map((s, index) => (
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
    <div
      ref={containerRef}
      className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 flex flex-col"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        )}

        {/* Export Button with Dropdown */}
        {!hideExport && chartData.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={handleExportPNG}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Export as PNG
                  </button>
                  <button
                    onClick={handleExportSVG}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Export as SVG
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chart — explicit pixel height so ResponsiveContainer always has a concrete size */}
      {chartData.length > 0 ? (
        <div ref={chartRef} style={{ height }}>
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          style={{ height }}
          className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm"
        >
          No data available
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
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
