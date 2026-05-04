'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useCreateDevice, useUpdateDevice } from '@/lib/hooks/useDevices';
import type { Device, DeviceDataSource } from '@repo/types';

interface DeviceFormProps {
  isOpen: boolean;
  onClose: () => void;
  device?: Device | null; // If provided, it's edit mode
  onSuccess?: () => void;
  applicationId?: string; // ADR-024: Application context from route (no selector)
}

type KVRow = { key: string; value: string };
type AttrRow = { key: string; type: 'number' | 'string' | 'boolean' | 'timestamp' | 'json' };

const DATA_TYPES = ['number', 'string', 'boolean', 'timestamp', 'json'] as const;
const DATA_SOURCES: { value: DeviceDataSource; label: string; description: string }[] = [
  { value: 'gateway', label: 'Gateway', description: 'Modbus / OPC-UA / MQTT gateway' },
  { value: 'workflow', label: 'Workflow', description: 'Derived by workflow (computed values)' },
  { value: 'http', label: 'HTTP', description: 'REST API / HTTP push' },
];

function kvRowsFromRecord(record: Record<string, string> | string[] | null | undefined): KVRow[] {
  if (!record) return [];
  // Handle legacy string[] format gracefully
  if (Array.isArray(record)) return record.map(tag => ({ key: tag, value: '' }));
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function attrRowsFromRecord(record: Record<string, string> | null | undefined): AttrRow[] {
  if (!record) return [];
  return Object.entries(record).map(([key, type]) => ({
    key,
    type: (DATA_TYPES as readonly string[]).includes(type) ? (type as AttrRow['type']) : 'string',
  }));
}

export function DeviceForm({ isOpen, onClose, device, onSuccess, applicationId }: DeviceFormProps) {
  const isEditMode = !!device;

  const [name, setName] = useState('');
  const [dataSource, setDataSource] = useState<DeviceDataSource>('gateway');
  const [tagRows, setTagRows] = useState<KVRow[]>([]);
  const [attrRows, setAttrRows] = useState<AttrRow[]>([]);

  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice(device?.deviceId || '');

  useEffect(() => {
    if (device) {
      setName(device.name);
      setDataSource(device.dataSource ?? 'gateway');
      setTagRows(kvRowsFromRecord(device.tags as any));
      setAttrRows(attrRowsFromRecord(device.attributes as any));
    } else {
      setName('');
      setDataSource('gateway');
      setTagRows([]);
      setAttrRows([]);
    }
  }, [device, isOpen]);

  // Tags helpers
  const addTagRow = () => setTagRows(r => [...r, { key: '', value: '' }]);
  const removeTagRow = (i: number) => setTagRows(r => r.filter((_, idx) => idx !== i));
  const updateTagRow = (i: number, field: 'key' | 'value', val: string) =>
    setTagRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  // Attributes helpers
  const addAttrRow = () => setAttrRows(r => [...r, { key: '', type: 'string' }]);
  const removeAttrRow = (i: number) => setAttrRows(r => r.filter((_, idx) => idx !== i));
  const updateAttrRow = (i: number, field: 'key' | 'type', val: string) =>
    setAttrRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a device name');
      return;
    }

    // Build tags record (skip rows with empty keys)
    const tagsRecord: Record<string, string> = {};
    for (const row of tagRows) {
      if (row.key.trim()) tagsRecord[row.key.trim()] = row.value;
    }

    // Build attributes record (skip rows with empty keys)
    const attrsRecord: Record<string, string> = {};
    for (const row of attrRows) {
      if (row.key.trim()) attrsRecord[row.key.trim()] = row.type;
    }

    try {
      const deviceData = {
        name: name.trim(),
        dataSource,
        tags: tagsRecord,
        attributes: Object.keys(attrsRecord).length > 0 ? attrsRecord : undefined,
        ...(applicationId && { applicationId }), // ADR-024: Application context from props
      };

      if (isEditMode) {
        await updateDevice.mutateAsync(deviceData);
      } else {
        await createDevice.mutateAsync(deviceData);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving device:', error);
      alert('Failed to save device. Please try again.');
    }
  };

  const isLoading = createDevice.isPending || updateDevice.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Device' : 'Create New Device'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Device Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Temperature Sensor - Zone A"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Data Source — ADR-046 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Source <span className="text-red-500">*</span>
          </label>
          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value as DeviceDataSource)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {DATA_SOURCES.map(({ value, label, description }) => (
              <option key={value} value={value}>{label} — {description}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Determines how data arrives for this device. Cannot be changed after creation without data implications.
          </p>
        </div>

        {/* Tags — key-value static metadata */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Tags <span className="text-xs text-slate-500 font-normal">(static metadata key-value pairs)</span>
            </label>
            <button
              type="button"
              onClick={addTagRow}
              className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
            >
              + Add Tag
            </button>
          </div>
          <div className="space-y-2">
            {tagRows.length === 0 && (
              <p className="text-xs text-slate-400 italic">No tags — click "+ Add Tag" to add one.</p>
            )}
            {tagRows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={row.key}
                  onChange={e => updateTagRow(i, 'key', e.target.value)}
                  placeholder="Key (e.g., model)"
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-slate-400 text-sm">:</span>
                <input
                  type="text"
                  value={row.value}
                  onChange={e => updateTagRow(i, 'value', e.target.value)}
                  placeholder="Value (e.g., Acme-X1)"
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeTagRow(i)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Attributes — device data schema (field → type) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Attributes <span className="text-xs text-slate-500 font-normal">(telemetry field → data type)</span>
            </label>
            <button
              type="button"
              onClick={addAttrRow}
              className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
            >
              + Add Field
            </button>
          </div>
          <div className="space-y-2">
            {attrRows.length === 0 && (
              <p className="text-xs text-slate-400 italic">No attributes — click "+ Add Field" to define the telemetry schema.</p>
            )}
            {attrRows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={row.key}
                  onChange={e => updateAttrRow(i, 'key', e.target.value)}
                  placeholder="Field (e.g., temperature)"
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-slate-400 text-sm">→</span>
                <select
                  value={row.type}
                  onChange={e => updateAttrRow(i, 'type', e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  {DATA_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeAttrRow(i)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            These field definitions are used by the "Write Device State" workflow node for type casting.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-slate-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update Device' : 'Create Device'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
