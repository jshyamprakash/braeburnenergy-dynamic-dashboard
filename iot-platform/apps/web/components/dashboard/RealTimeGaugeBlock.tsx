'use client';

import { GaugeBlock } from '../blocks/GaugeBlock';
import { useDeviceRealtime } from '@/hooks/useDeviceData';

interface RealTimeGaugeBlockProps {
  deviceId?: string;
  field?: string;
  label?: string;
  min?: number;
  max?: number;
  unit?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  size?: 'sm' | 'md' | 'lg';
  value?: number; // Fallback value when no device is connected
}

/**
 * RealTimeGaugeBlock
 *
 * Wrapper around GaugeBlock that fetches real-time data from a device
 */
export function RealTimeGaugeBlock({
  deviceId,
  field,
  value: fallbackValue = 0,
  ...gaugeProps
}: RealTimeGaugeBlockProps) {
  const latestState = useDeviceRealtime(deviceId);

  // Extract the specific field value from device state
  let currentValue = fallbackValue;
  if (latestState && field && latestState.data && typeof latestState.data[field] === 'number') {
    currentValue = latestState.data[field];
  }

  return (
    <GaugeBlock
      {...gaugeProps}
      value={currentValue}
    />
  );
}
