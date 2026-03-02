'use client';

import { useMemo } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface GaugeBlockProps {
  /**
   * Current value to display
   */
  value: number;

  /**
   * Minimum value of the gauge range
   */
  min?: number;

  /**
   * Maximum value of the gauge range
   */
  max?: number;

  /**
   * Label for the gauge
   */
  label?: string;

  /**
   * Unit of measurement (e.g., "°C", "PSI", "%")
   */
  unit?: string;

  /**
   * Warning threshold (yellow zone starts)
   */
  warningThreshold?: number;

  /**
   * Critical threshold (red zone starts)
   */
  criticalThreshold?: number;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show the numeric value overlay
   */
  showValue?: boolean;

  /**
   * ISO timestamp of the last data update — shown in the footer so the reader
   * knows how fresh the value is. Displayed as HH:MM:SS (or "DD MMM HH:MM" for
   * data from a previous day).
   */
  lastUpdated?: string;
}

/**
 * GaugeBlock Component
 *
 * Displays a circular radial gauge chart for visualizing a single data point
 * with configurable thresholds for warning and critical states.
 *
 * Features:
 * - Color-coded zones (normal/warning/critical)
 * - Responsive sizing
 * - Customizable ranges and thresholds
 * - Real-time value updates
 *
 * @example
 * <GaugeBlock
 *   value={75}
 *   min={0}
 *   max={100}
 *   label="Temperature"
 *   unit="°C"
 *   warningThreshold={80}
 *   criticalThreshold={95}
 * />
 */
export function GaugeBlock({
  value,
  min = 0,
  max = 100,
  label,
  unit = '',
  warningThreshold,
  criticalThreshold,
  size = 'md',
  showValue = true,
  lastUpdated,
}: GaugeBlockProps) {
  const formattedTime = useMemo(() => {
    if (!lastUpdated) return null;
    const d = new Date(lastUpdated);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }, [lastUpdated]);
  // Calculate percentage for gauge fill
  const percentage = useMemo(() => {
    const range = max - min;
    const normalizedValue = Math.max(min, Math.min(max, value)) - min;
    return (normalizedValue / range) * 100;
  }, [value, min, max]);

  // Determine color based on thresholds
  const gaugeColor = useMemo(() => {
    if (criticalThreshold !== undefined && value >= criticalThreshold) {
      return '#ef4444'; // red-500
    }
    if (warningThreshold !== undefined && value >= warningThreshold) {
      return '#f59e0b'; // amber-500
    }
    return '#10b981'; // green-500
  }, [value, warningThreshold, criticalThreshold]);

  // Determine status text
  const status = useMemo(() => {
    if (criticalThreshold !== undefined && value >= criticalThreshold) {
      return 'Critical';
    }
    if (warningThreshold !== undefined && value >= warningThreshold) {
      return 'Warning';
    }
    return 'Normal';
  }, [value, warningThreshold, criticalThreshold]);

  // Size configurations with min heights for standalone usage
  const sizeConfig = {
    sm: { minHeight: '180px', fontSize: 'text-xl', unitSize: 'text-xs', labelSize: 'text-xs', containerPadding: 'p-2' },
    md: { minHeight: '240px', fontSize: 'text-2xl', unitSize: 'text-sm', labelSize: 'text-sm', containerPadding: 'p-3' },
    lg: { minHeight: '300px', fontSize: 'text-3xl', unitSize: 'text-sm', labelSize: 'text-sm', containerPadding: 'p-4' },
  };

  const config = sizeConfig[size];

  // Data for Recharts
  const data = [
    {
      name: 'value',
      value: percentage,
      fill: gaugeColor,
    },
  ];

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 h-full flex flex-col ${config.containerPadding}`}
      style={{ minHeight: config.minHeight }}
    >
      {/* Header */}
      {label && (
        <div className="mb-2 flex-shrink-0">
          <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${config.labelSize}`}>{label}</h3>
        </div>
      )}

      {/* Gauge Chart - grows to fill available space */}
      <div className="relative flex-1 min-h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="95%"
            barSize={20}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: '#374151' }} // gray-700 for dark mode compatibility
              dataKey="value"
              cornerRadius={10}
              fill={gaugeColor}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Value Overlay */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className={`font-bold ${config.fontSize}`} style={{ color: gaugeColor }}>
              {value.toFixed(1)}
              <span className={`${config.unitSize} text-gray-500 dark:text-gray-400 ml-1`}>{unit}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {min} - {max} {unit}
            </div>
          </div>
        )}
      </div>

      {/* Status and Thresholds */}
      <div className="mt-2 flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded-full font-medium ${
              status === 'Critical'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : status === 'Warning'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            }`}
          >
            {status}
          </div>
        </div>

        {/* Threshold indicators */}
        {(warningThreshold !== undefined || criticalThreshold !== undefined) && (
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            {warningThreshold !== undefined && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{warningThreshold}{unit}</span>
              </div>
            )}
            {criticalThreshold !== undefined && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{criticalThreshold}{unit}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Last updated timestamp */}
      {formattedTime && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-right flex-shrink-0">
          Last update: {formattedTime}
        </div>
      )}
    </div>
  );
}
