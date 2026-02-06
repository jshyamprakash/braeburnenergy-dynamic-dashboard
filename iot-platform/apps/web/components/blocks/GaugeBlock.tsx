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
}: GaugeBlockProps) {
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

  // Size configurations
  const sizeConfig = {
    sm: { height: 120, fontSize: 'text-xl', labelSize: 'text-xs', containerPadding: 'p-3' },
    md: { height: 180, fontSize: 'text-3xl', labelSize: 'text-sm', containerPadding: 'p-4' },
    lg: { height: 240, fontSize: 'text-4xl', labelSize: 'text-base', containerPadding: 'p-6' },
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
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${config.containerPadding}`}>
      {/* Header */}
      {label && (
        <div className="mb-2">
          <h3 className={`font-semibold text-gray-900 ${config.labelSize}`}>{label}</h3>
        </div>
      )}

      {/* Gauge Chart */}
      <div className="relative" style={{ height: config.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={size === 'sm' ? 12 : size === 'md' ? 16 : 20}
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
              background={{ fill: '#e5e7eb' }}
              dataKey="value"
              cornerRadius={10}
              fill={gaugeColor}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Value Overlay */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`font-bold ${config.fontSize}`} style={{ color: gaugeColor }}>
              {value.toFixed(1)}
              <span className="text-gray-500 ml-1">{unit}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {min} - {max} {unit}
            </div>
          </div>
        )}
      </div>

      {/* Status and Thresholds */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded-full font-medium ${
              status === 'Critical'
                ? 'bg-red-100 text-red-700'
                : status === 'Warning'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {status}
          </div>
        </div>

        {/* Threshold indicators */}
        {(warningThreshold !== undefined || criticalThreshold !== undefined) && (
          <div className="flex items-center gap-3 text-gray-500">
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
    </div>
  );
}
