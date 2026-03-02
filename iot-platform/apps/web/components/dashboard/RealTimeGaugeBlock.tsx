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
 * Wrapper around GaugeBlock that fetches real-time data from a device.
 * Shows stale indicator when the workflow producing derived values has been deleted (ADR-034).
 */
export function RealTimeGaugeBlock({
  deviceId,
  field,
  value: fallbackValue = 0,
  ...gaugeProps
}: RealTimeGaugeBlockProps) {
  const { state: latestState, stale, staledAt } = useDeviceRealtime(deviceId);

  // Extract field value from derived state or raw data. Historically the
  // hook returned a `derived` object, but newer versions merge derived fields
  // into `state.data` while still keeping `derived` for backwards compatibility
  // (see useDeviceRealtime queryFn). We'll prefer the explicit derived value
  // when available but fall back to the merged payload so gauges continue to
  // work after the migration.
  let currentValue = fallbackValue;
  let hasData = false;
  if (latestState && field) {
    const raw =
      latestState.derived?.[field] ?? latestState.data?.[field];
    if (raw != null) {
      const coerced = Number(raw);
      if (!isNaN(coerced)) {
        currentValue = coerced;
        hasData = true;
      }
    }
  }

  // When a device+field is configured but no derived value exists yet, show
  // a "No data" placeholder instead of rendering a gauge stuck at 0.
  if (deviceId && field && !hasData) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1">
        <span className="text-2xl text-gray-300 dark:text-gray-600">—</span>
        <p className="text-xs text-gray-400 dark:text-gray-500">No data</p>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full ${stale ? 'rounded-lg ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}
      title={stale && staledAt ? `Workflow deleted — showing last known value as of ${staledAt}` : undefined}
    >
      {stale && (
        <div className="absolute top-1 right-1 z-10 flex items-center gap-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded-full font-medium pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          Stale
        </div>
      )}
      <GaugeBlock
        {...gaugeProps}
        value={currentValue}
        lastUpdated={latestState?.timestamp}
      />
    </div>
  );
}
