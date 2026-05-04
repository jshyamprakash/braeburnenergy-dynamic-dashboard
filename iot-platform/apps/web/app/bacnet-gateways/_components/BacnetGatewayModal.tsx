'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import type { BacnetGateway, BacnetObject, CreateBacnetGatewayInput } from '@repo/types';
import { useApplications } from '@/lib/hooks/useApplications';
import { useDevices } from '@/lib/hooks/useDevices';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBacnetGatewayInput) => Promise<void>;
  gateway?: BacnetGateway | null;
  applicationId?: string;
  isLoading?: boolean;
}

const OBJECT_TYPES = [
  'analogInput', 'analogOutput', 'analogValue',
  'binaryInput', 'binaryOutput', 'binaryValue',
  'multiStateInput', 'multiStateOutput', 'multiStateValue',
] as const;

const PROPERTIES = ['presentValue', 'statusFlags', 'description', 'units'] as const;

type ObjectRow = BacnetObject & { _tempId: string };

export function BacnetGatewayModal({ isOpen, onClose, onSubmit, gateway, applicationId: defaultAppId, isLoading }: Props) {
  const { data: appsData } = useApplications({ limit: 100, offset: 0 });
  const applications = appsData?.data || [];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(defaultAppId || '');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('47808');
  const [broadcastAddress, setBroadcastAddress] = useState('');
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pollingInterval, setPollingInterval] = useState('10000');
  const [objects, setObjects] = useState<ObjectRow[]>([]);

  const { data: devicesData } = useDevices({ applicationId: selectedAppId || defaultAppId || '', limit: 100, offset: 0 });
  const devices = devicesData?.devices || [];

  const isEdit = !!gateway;

  useEffect(() => {
    if (gateway && isOpen) {
      setName(gateway.name);
      setDescription(gateway.description || '');
      setSelectedAppId(gateway.applicationId || defaultAppId || '');
      setHost(gateway.host);
      setPort((gateway.port ?? 47808).toString());
      setBroadcastAddress(gateway.broadcastAddress || '');
      setPollingEnabled(gateway.polling.enabled);
      setPollingInterval(gateway.polling.interval.toString());
      setObjects(gateway.objects.map((o, i) => ({ ...o, _tempId: i.toString() })));
    } else if (isOpen) {
      setName(''); setDescription(''); setSelectedAppId(defaultAppId || '');
      setHost(''); setPort('47808'); setBroadcastAddress('');
      setPollingEnabled(true); setPollingInterval('10000'); setObjects([]);
    }
  }, [gateway, isOpen, defaultAppId]);

  const addObject = () => setObjects([...objects, {
    _tempId: Date.now().toString(),
    objectType: 'analogInput',
    instanceNumber: 0,
    property: 'presentValue',
    field: '',
  }]);

  const removeObject = (id: string) => setObjects(objects.filter((o) => o._tempId !== id));

  const updateObject = (id: string, key: string, val: any) =>
    setObjects(objects.map((o) => o._tempId === id ? { ...o, [key]: val } : o));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim()) return;

    const payload: CreateBacnetGatewayInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      applicationId: selectedAppId || undefined,
      host: host.trim(),
      port: parseInt(port, 10),
      broadcastAddress: broadcastAddress.trim() || undefined,
      objects: objects.filter((o) => o.field.trim()).map(({ _tempId, ...rest }) => rest),
      polling: { enabled: pollingEnabled, interval: parseInt(pollingInterval, 10) },
      deviceMapping: { autoRegister: true, deviceIdPrefix: 'BACNET_' },
    };

    await onSubmit(payload);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit BACnet Gateway' : 'Create BACnet Gateway'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Application</label>
            <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-800 dark:text-white">
              <option value="">-- Select --</option>
              {applications.map((a: any) => (
                <option key={a.applicationId} value={a.applicationId}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-800 dark:text-white" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Host / IP *</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} required placeholder="192.168.1.10"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">UDP Port</label>
            <input type="number" value={port} onChange={(e) => setPort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-800 dark:text-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Broadcast Address (optional)</label>
          <input value={broadcastAddress} onChange={(e) => setBroadcastAddress(e.target.value)} placeholder="192.168.1.255"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-800 dark:text-white" />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={pollingEnabled} onChange={(e) => setPollingEnabled(e.target.checked)} />
            <span className="text-sm text-gray-700 dark:text-slate-300">Enable Polling</span>
          </label>
          {pollingEnabled && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mr-2">Interval (ms)</label>
              <input type="number" min="100" value={pollingInterval} onChange={(e) => setPollingInterval(e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-800 dark:text-white text-sm" />
            </div>
          )}
        </div>

        {/* BACnet Objects */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">BACnet Objects</label>
            <button type="button" onClick={addObject}
              className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100">
              + Add Object
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {objects.length === 0 && (
              <p className="text-xs text-slate-400 italic">No objects — click "Add Object" to define them.</p>
            )}
            {objects.map((obj) => (
              <div key={obj._tempId} className="flex gap-2 items-center text-xs">
                <select value={obj.objectType} onChange={(e) => updateObject(obj._tempId, 'objectType', e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-800 dark:text-white">
                  {OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" value={obj.instanceNumber} onChange={(e) => updateObject(obj._tempId, 'instanceNumber', parseInt(e.target.value, 10))}
                  placeholder="Instance" className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-800 dark:text-white" />
                <select value={obj.property} onChange={(e) => updateObject(obj._tempId, 'property', e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-800 dark:text-white">
                  {PROPERTIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={obj.field} onChange={(e) => updateObject(obj._tempId, 'field', e.target.value)}
                  placeholder="Field name" className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-800 dark:text-white" />
                <select value={obj.deviceId || ''} onChange={(e) => updateObject(obj._tempId, 'deviceId', e.target.value || undefined)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-800 dark:text-white" title="Map to device">
                  <option value="">-- Device --</option>
                  {devices.map((d: any) => <option key={d.deviceId} value={d.deviceId}>{d.name}</option>)}
                </select>
                <button type="button" onClick={() => removeObject(obj._tempId)}
                  className="text-red-400 hover:text-rose-600 text-lg leading-none px-1">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isLoading}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
