'use client';

import { useState, useEffect } from 'react';
import type { DashboardBlock } from './DashboardBuilder';
import { useDevices, useDeviceFields } from '@/hooks/useDeviceData';

interface BlockConfigPanelProps {
  block: DashboardBlock;
  onUpdate: (config: DashboardBlock['config']) => void;
  onClose: () => void;
  applicationId?: string;
}

/**
 * BlockConfigPanel Component
 *
 * Configuration panel for editing block properties
 */
export function BlockConfigPanel({ block, onUpdate, onClose, applicationId }: BlockConfigPanelProps) {
  const [config, setConfig] = useState(block.config);
  const { data: devices = [], isLoading: devicesLoading, error: devicesError } = useDevices(applicationId);
  const fields = useDeviceFields(config.deviceId);

  const filteredDevices = devices;

  // Sync config only when switching to a different block (not when config updates)
  useEffect(() => {
    setConfig(block.config);
  }, [block.id]); // Only depend on block.id, NOT block.config

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(newConfig);
  };

  const renderConfigFields = () => {
    switch (block.type) {
      case 'gauge':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={config.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Gauge title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Device
              </label>
              {devicesLoading ? (
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  Loading devices...
                </div>
              ) : devicesError ? (
                <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  Error loading devices
                </div>
              ) : (
                <select
                  value={config.deviceId || ''}
                  onChange={(e) => {
                    // Update both deviceId and field in a single operation
                    const newConfig = { ...config, deviceId: e.target.value, field: '' };
                    setConfig(newConfig);
                    onUpdate(newConfig);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  disabled={filteredDevices.length === 0}
                >
                  <option value="">Select a device</option>
                  {filteredDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.name} ({device.deviceId.slice(-6)})
                    </option>
                  ))}
                </select>
              )}
              {!devicesLoading && !devicesError && filteredDevices.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  No devices found. Run the simulator to create devices.
                </p>
              )}
              {!devicesLoading && !devicesError && filteredDevices.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>

            {config.deviceId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Field
                </label>
                <select
                  value={config.field || ''}
                  onChange={(e) => handleChange('field', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a field</option>
                  {fields.map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {entry.key}
                    </option>
                  ))}
                </select>
                {fields.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No attributes defined on this device. Add attributes on the Device detail page first.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {fields.length} field{fields.length !== 1 ? 's' : ''} available. Values come from derived state — shows "No data" until a workflow writes them.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min Value
                </label>
                <input
                  type="number"
                  value={config.min ?? 0}
                  onChange={(e) => handleChange('min', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Value
                </label>
                <input
                  type="number"
                  value={config.max ?? 100}
                  onChange={(e) => handleChange('max', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={config.unit || ''}
                onChange={(e) => handleChange('unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., °C, %, PSI"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Warning Threshold
                </label>
                <input
                  type="number"
                  value={config.warningThreshold ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'warningThreshold',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Critical Threshold
                </label>
                <input
                  type="number"
                  value={config.criticalThreshold ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'criticalThreshold',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
            </div>
          </>
        );

      case 'chart':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={config.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Chart title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Device
              </label>
              <select
                value={config.deviceId || ''}
                onChange={(e) => handleChange('deviceId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Use mock data</option>
                {filteredDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.name} ({device.deviceId.slice(-6)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chart Type
              </label>
              <select
                value={config.chartType || 'line'}
                onChange={(e) => handleChange('chartType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showLegend !== false}
                  onChange={(e) => handleChange('showLegend', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Legend</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showGrid !== false}
                  onChange={(e) => handleChange('showGrid', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Grid</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.smooth !== false}
                  onChange={(e) => handleChange('smooth', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Smooth Curves</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Point Limit
              </label>
              <input
                type="number"
                min={5}
                max={500}
                step={5}
                value={config.limit ?? 50}
                onChange={(e) => handleChange('limit', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Max data points in the rolling window. Oldest points are dropped as new ones arrive.
              </p>
            </div>

            {config.deviceId ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-xs text-green-800 dark:text-green-300">
                  <strong>✓ Connected:</strong> Displaying real-time data from the selected device.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Select a device above to display real-time data, or leave empty to use mock data.
                </p>
              </div>
            )}
          </>
        );

      case 'liveStream':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={config.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Live stream title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Device
              </label>
              <select
                value={config.deviceId || ''}
                onChange={(e) => handleChange('deviceId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All devices</option>
                {filteredDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.name} ({device.deviceId.slice(-6)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Point Limit
              </label>
              <input
                type="number"
                min={5}
                max={500}
                step={5}
                value={config.limit ?? 50}
                onChange={(e) => handleChange('limit', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Max entries in the rolling window. Oldest entries are dropped as new ones arrive.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Tip:</strong> Leave empty to show data from all devices, or select a specific device to filter.
              </p>
            </div>
          </>
        );

      case 'activeAlarms': {
        const stateOptions = ['ACTIVE_UNACKED', 'ACTIVE_ACKED', 'CLEARED_UNACKED', 'CLEARED_ACKED'];
        const priorityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
        const currentStates: string[] = config.filterByState ?? [];
        const currentPriorities: string[] = config.filterByPriority ?? [];

        const toggleArrayItem = (key: string, current: string[], value: string) => {
          const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
          handleChange(key, next);
        };

        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={config.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Active Alarms"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max alarms to show
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={config.maxCount ?? 5}
                onChange={(e) => handleChange('maxCount', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State filter (empty = all)
              </label>
              <div className="space-y-1.5">
                {stateOptions.map((state) => (
                  <label key={state} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentStates.includes(state)}
                      onChange={() => toggleArrayItem('filterByState', currentStates, state)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{state.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority filter (empty = all)
              </label>
              <div className="space-y-1.5">
                {priorityOptions.map((priority) => (
                  <label key={priority} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentPriorities.includes(priority)}
                      onChange={() => toggleArrayItem('filterByPriority', currentPriorities, priority)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{priority}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        );
      }

      default:
        return <div>Unknown block type</div>;
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Configure Block
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {block.type === 'gauge' ? 'Gauge' : block.type === 'chart' ? 'Chart' : block.type === 'liveStream' ? 'Live Stream' : 'Active Alarms'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Close configuration"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Configuration Fields */}
      <div className="p-4 space-y-4">
        {renderConfigFields()}
      </div>

      {/* Help Text */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Changes are applied automatically. Click outside or press the X to close this panel.
        </p>
      </div>
    </div>
  );
}
