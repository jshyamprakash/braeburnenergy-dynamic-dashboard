'use client';

import { useDeviceRealtime } from '@/hooks/useDeviceData';
import type { DashboardBlock } from './DashboardBuilder';

interface StatusTextBlockProps {
  block: DashboardBlock;
  isEditMode: boolean;
}

const STATUS_COLORS = {
  GOOD: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  WARNING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  UNKNOWN: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export function StatusTextBlock({ block, isEditMode }: StatusTextBlockProps) {
  const { title = 'Status Indicator', deviceId, field, goodValues = [], warningValues = [], compareMode = 'string' } = block.config;

  const { state: derivedState } = useDeviceRealtime(deviceId);

  const getStatus = () => {
    if (!field || !derivedState) return 'UNKNOWN';

    const value = (derivedState as any)[field];
    if (value === undefined || value === null) return 'UNKNOWN';

    if (compareMode === 'numeric') {
      const numValue = Number(value);
      if (isNaN(numValue)) return 'UNKNOWN';
      if (numValue <= (typeof goodValues[0] === 'number' ? goodValues[0] : 50)) return 'GOOD';
      if (numValue <= (typeof warningValues[0] === 'number' ? warningValues[0] : 80)) return 'WARNING';
      return 'CRITICAL';
    }

    // String mode: check if value is in the lists
    const strValue = String(value);
    if (goodValues.includes(strValue)) return 'GOOD';
    if (warningValues.includes(strValue)) return 'WARNING';
    return 'CRITICAL';
  };

  const status = getStatus();
  const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.UNKNOWN;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-4 gap-4">
      {isEditMode ? (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 p-4">
          Status Indicator — configure device, field, and thresholds in the settings panel
        </div>
      ) : !deviceId || !field ? (
        <div className="text-sm text-gray-400 dark:text-gray-500">Not configured</div>
      ) : (
        <>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          <div className={`px-6 py-3 rounded-lg text-lg font-bold ${colorClass}`}>
            {status}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {field}: <span className="font-mono">{(derivedState as any)?.[field]}</span>
          </p>
        </>
      )}
    </div>
  );
}
