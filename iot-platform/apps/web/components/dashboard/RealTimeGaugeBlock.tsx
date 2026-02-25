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

  // Extract field value: derived takes precedence over raw data (ADR-028).
  // Use Number() to handle string-typed values (e.g. derived fields stored as "94.1").
  let currentValue = fallbackValue;
  if (latestState && field) {
    const raw = latestState.derived?.[field] ?? latestState.data?.[field];
    if (raw != null) {
      const coerced = Number(raw);
      if (!isNaN(coerced)) currentValue = coerced;
    }
  }

  return (
    <GaugeBlock
      {...gaugeProps}
      value={currentValue}
    />
  );
}
