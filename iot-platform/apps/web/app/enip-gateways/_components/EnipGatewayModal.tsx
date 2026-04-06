'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import type { EnipGateway, EnipTag, CreateEnipGatewayInput } from '@repo/types';
import { useApplications } from '@/lib/hooks/useApplications';
import { useDevices } from '@/lib/hooks/useDevices';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEnipGatewayInput) => Promise<void>;
  gateway?: EnipGateway | null;
  applicationId?: string;
  isLoading?: boolean;
}

const DATA_TYPES = ['REAL', 'DINT', 'INT', 'SINT', 'BOOL', 'DWORD', 'WORD', 'BYTE'] as const;
type TagRow = EnipTag & { _tempId: string };

export function EnipGatewayModal({ isOpen, onClose, onSubmit, gateway, applicationId: defaultAppId, isLoading }: Props) {
  const { data: appsData } = useApplications({ limit: 100, offset: 0 });
  const applications = appsData?.data || [];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(defaultAppId || '');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('44818');
  const [slot, setSlot] = useState('0');
  const [timeout, setTimeout_] = useState('10000');
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pollingInterval, setPollingInterval] = useState('5000');
  const [tags, setTags] = useState<TagRow[]>([]);

  const { data: devicesData } = useDevices({ applicationId: selectedAppId || defaultAppId || '', limit: 100, offset: 0 });
  const devices = devicesData?.devices || [];

  const isEdit = !!gateway;

  useEffect(() => {
    if (gateway && isOpen) {
      setName(gateway.name);
      setDescription(gateway.description || '');
      setSelectedAppId(gateway.applicationId || defaultAppId || '');
      setHost(gateway.host);
      setPort((gateway.port ?? 44818).toString());
      setSlot((gateway.slot ?? 0).toString());
      setTimeout_((gateway.timeout ?? 10000).toString());
      setPollingEnabled(gateway.polling.enabled);
      setPollingInterval(gateway.polling.interval.toString());
      setTags(gateway.tags.map((t, i) => ({ ...t, _tempId: i.toString() })));
    } else if (isOpen) {
      setName(''); setDescription(''); setSelectedAppId(defaultAppId || '');
      setHost(''); setPort('44818'); setSlot('0'); setTimeout_('10000');
      setPollingEnabled(true); setPollingInterval('5000'); setTags([]);
    }
  }, [gateway, isOpen, defaultAppId]);

  const addTag = () => setTags([...tags, { _tempId: Date.now().toString(), tagName: '', field: '' }]);
  const removeTag = (id: string) => setTags(tags.filter((t) => t._tempId !== id));
  const updateTag = (id: string, key: string, val: any) =>
    setTags(tags.map((t) => t._tempId === id ? { ...t, [key]: val } : t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim()) return;

    const payload: CreateEnipGatewayInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      applicationId: selectedAppId || undefined,
      host: host.trim(),
      port: parseInt(port, 10),
      slot: parseInt(slot, 10),
      timeout: parseInt(timeout, 10),
      tags: tags.filter((t) => t.tagName.trim() && t.field.trim()).map(({ _tempId, ...rest }) => rest),
      polling: { enabled: pollingEnabled, interval: parseInt(pollingInterval, 10) },
      deviceMapping: { autoRegister: true, deviceIdPrefix: 'ENIP_' },
    };

    await onSubmit(payload);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit EtherNet/IP Gateway' : 'Create EtherNet/IP Gateway'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application</label>
            <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white">
              <option value="">-- Select --</option>
              {applications.map((a: any) => <option key={a.applicationId} value={a.applicationId}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PLC Host / IP *</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} required placeholder="192.168.1.10"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TCP Port</label>
            <input type="number" value={port} onChange={(e) => setPort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPU Slot</label>
            <input type="number" min="0" max="15" value={slot} onChange={(e) => setSlot(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white" />
            <p className="text-xs text-gray-500 mt-1">ControlLogix: 0–15, CompactLogix: 0</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timeout (ms)</label>
            <input type="number" value={timeout} onChange={(e) => setTimeout_(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={pollingEnabled} onChange={(e) => setPollingEnabled(e.target.checked)} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable Polling</span>
          </label>
          {pollingEnabled && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Interval (ms)</label>
              <input type="number" min="100" value={pollingInterval} onChange={(e) => setPollingInterval(e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm" />
            </div>
          )}
        </div>

        {/* CIP Tags */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CIP Tags</label>
            <button type="button" onClick={addTag}
              className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100">
              + Add Tag
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {tags.length === 0 && <p className="text-xs text-gray-400 italic">No tags — click "Add Tag".</p>}
            {tags.map((tag) => (
              <div key={tag._tempId} className="flex gap-2 items-center text-xs">
                <input value={tag.tagName} onChange={(e) => updateTag(tag._tempId, 'tagName', e.target.value)}
                  placeholder="Tag name (e.g. Temperature_1)"
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white" />
                <input value={tag.field} onChange={(e) => updateTag(tag._tempId, 'field', e.target.value)}
                  placeholder="Field name"
                  className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white" />
                <select value={tag.dataType || ''} onChange={(e) => updateTag(tag._tempId, 'dataType', e.target.value || undefined)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white">
                  <option value="">Type</option>
                  {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={tag.deviceId || ''} onChange={(e) => updateTag(tag._tempId, 'deviceId', e.target.value || undefined)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white" title="Map to device">
                  <option value="">-- Device --</option>
                  {devices.map((d: any) => <option key={d.deviceId} value={d.deviceId}>{d.name}</option>)}
                </select>
                <button type="button" onClick={() => removeTag(tag._tempId)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isLoading}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {isLoading ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
