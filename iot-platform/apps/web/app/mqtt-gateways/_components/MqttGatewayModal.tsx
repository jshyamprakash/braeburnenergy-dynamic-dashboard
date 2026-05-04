'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { MqttGateway, CreateMqttGatewayInput, MqttTopicMapping } from '@repo/types';
import { X, ChevronDown } from 'lucide-react';

interface MqttGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMqttGatewayInput) => Promise<void>;
  gateway?: MqttGateway | null;
  isLoading?: boolean;
}

type TopicMappingRow = MqttTopicMapping & { _tempId?: string };

export function MqttGatewayModal({
  isOpen,
  onClose,
  onSubmit,
  gateway,
  isLoading,
}: MqttGatewayModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brokerUrl, setBrokerUrl] = useState('mqtt://localhost:1883');
  const [clientId, setClientId] = useState('');
  const [keepalive, setKeepalive] = useState('60');
  const [connectTimeout, setConnectTimeout] = useState('10000');
  const [reconnectPeriod, setReconnectPeriod] = useState('5000');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tlsEnabled, setTlsEnabled] = useState(false);
  const [topicMappings, setTopicMappings] = useState<TopicMappingRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedMappingId, setExpandedMappingId] = useState<string | null>(null);

  const isEditMode = !!gateway;

  useEffect(() => {
    if (gateway && isOpen) {
      setName(gateway.name);
      setDescription(gateway.description || '');
      setBrokerUrl(gateway.brokerUrl);
      setClientId(gateway.clientId);
      setKeepalive(gateway.keepalive?.toString() || '60');
      setConnectTimeout(gateway.connectTimeout?.toString() || '10000');
      setReconnectPeriod(gateway.reconnectPeriod?.toString() || '5000');
      setUsername(gateway.auth?.username || '');
      setPassword(gateway.auth?.password || '');
      setTlsEnabled(gateway.tls?.enabled || false);
      setTopicMappings(
        gateway.topicMappings?.map((t, i) => ({ ...t, _tempId: i.toString() })) || []
      );
    } else if (isOpen) {
      setName('');
      setDescription('');
      setBrokerUrl('mqtt://localhost:1883');
      setClientId('');
      setKeepalive('60');
      setConnectTimeout('10000');
      setReconnectPeriod('5000');
      setUsername('');
      setPassword('');
      setTlsEnabled(false);
      setTopicMappings([]);
    }
    setErrors({});
  }, [gateway, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name required';
    if (!brokerUrl.trim()) errs.brokerUrl = 'Broker URL required';
    if (!brokerUrl.match(/^(mqtt|mqtts|ws|wss):\/\//))
      errs.brokerUrl = 'Invalid URL scheme (use mqtt://, mqtts://, ws://, or wss://)';
    if (!isNaN(Number(connectTimeout)) && Number(connectTimeout) < 1000)
      errs.connectTimeout = 'Must be >= 1000ms';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      name,
      description: description || undefined,
      brokerUrl,
      clientId: clientId || undefined,
      keepalive: parseInt(keepalive) || 60,
      connectTimeout: parseInt(connectTimeout) || 10000,
      reconnectPeriod: parseInt(reconnectPeriod) || 5000,
      auth: username ? { username, password } : undefined,
      tls: tlsEnabled ? { enabled: true } : undefined,
      topicMappings: topicMappings.filter((t) => t.topic && t.field && t.deviceId),
    });
  };

  const addTopicMapping = () => {
    setTopicMappings([
      ...topicMappings,
      {
        topic: '',
        field: '',
        deviceId: '',
        payloadFormat: 'json',
        qos: 0,
        processingOverrides: undefined,
        _tempId: Date.now().toString(),
      },
    ]);
  };

  const removeTopicMapping = (tempId: string) => {
    setTopicMappings(topicMappings.filter((t) => t._tempId !== tempId));
  };

  const updateTopicMapping = (tempId: string, updates: Partial<MqttTopicMapping>) => {
    setTopicMappings(
      topicMappings.map((t) => (t._tempId === tempId ? { ...t, ...updates } : t))
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit MQTT Gateway' : 'New MQTT Gateway'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Gateway name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}

          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
          />

          <input
            type="text"
            placeholder="Broker URL (e.g., mqtt://localhost:1883)"
            value={brokerUrl}
            onChange={(e) => setBrokerUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
          />
          {errors.brokerUrl && <p className="text-xs text-red-500">{errors.brokerUrl}</p>}

          <input
            type="text"
            placeholder="Client ID (optional)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
          />
        </div>

        {/* Connection Settings */}
        <div className="space-y-2 border-t pt-3">
          <h4 className="text-sm font-semibold">Connection Settings</h4>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Keepalive (s)"
              value={keepalive}
              onChange={(e) => setKeepalive(e.target.value)}
              className="px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
            />
            <input
              type="number"
              placeholder="Connect timeout (ms)"
              value={connectTimeout}
              onChange={(e) => setConnectTimeout(e.target.value)}
              className="px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
            />
            <input
              type="number"
              placeholder="Reconnect period (ms)"
              value={reconnectPeriod}
              onChange={(e) => setReconnectPeriod(e.target.value)}
              className="px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
            />
          </div>
        </div>

        {/* Auth */}
        <div className="space-y-2 border-t pt-3">
          <h4 className="text-sm font-semibold">Authentication</h4>
          <input
            type="text"
            placeholder="Username (optional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
          />
          <input
            type="password"
            placeholder="Password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm dark:bg-slate-800 dark:border-gray-600"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tlsEnabled}
              onChange={(e) => setTlsEnabled(e.target.checked)}
              className="rounded"
            />
            Enable TLS
          </label>
        </div>

        {/* Topic Mappings */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold">Topic Mappings</h4>
            <button
              type="button"
              onClick={addTopicMapping}
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              + Add
            </button>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto">
            {topicMappings.map((mapping) => (
              <div key={mapping._tempId} className="border rounded p-2 dark:bg-slate-800 dark:border-gray-600 space-y-2">
                {/* Main row */}
                <div className="flex gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Topic"
                    value={mapping.topic}
                    onChange={(e) => updateTopicMapping(mapping._tempId!, { topic: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    placeholder="Field"
                    value={mapping.field}
                    onChange={(e) => updateTopicMapping(mapping._tempId!, { field: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    placeholder="Device ID"
                    value={mapping.deviceId}
                    onChange={(e) => updateTopicMapping(mapping._tempId!, { deviceId: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                  <select
                    value={mapping.qos}
                    onChange={(e) => updateTopicMapping(mapping._tempId!, { qos: Number(e.target.value) as any })}
                    className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="0">QoS 0</option>
                    <option value="1">QoS 1</option>
                    <option value="2">QoS 2</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMappingId(
                        expandedMappingId === mapping._tempId ? null : mapping._tempId!
                      )
                    }
                    className="text-gray-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-gray-200 p-1 transition-transform"
                    style={{
                      transform:
                        expandedMappingId === mapping._tempId
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                    }}
                    title="Toggle processing overrides"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTopicMapping(mapping._tempId!)}
                    className="text-rose-600 hover:text-red-700 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Overrides section (collapsible) */}
                {expandedMappingId === mapping._tempId && (
                  <div className="border-t pt-2 pl-2 space-y-2 text-xs">
                    <div className="text-gray-600 dark:text-slate-400 font-semibold mb-1">
                      Processing Overrides
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-gray-600 dark:text-slate-400 mb-1">
                          Noise Threshold
                        </label>
                        <input
                          type="number"
                          placeholder="Global default"
                          value={mapping.processingOverrides?.noiseThreshold ?? ''}
                          onChange={(e) =>
                            updateTopicMapping(mapping._tempId!, {
                              processingOverrides: {
                                ...mapping.processingOverrides,
                                noiseThreshold: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-gray-600 dark:text-slate-400 mb-1">
                          Delta %
                        </label>
                        <input
                          type="number"
                          placeholder="Global default"
                          value={mapping.processingOverrides?.deltaPercent ?? ''}
                          onChange={(e) =>
                            updateTopicMapping(mapping._tempId!, {
                              processingOverrides: {
                                ...mapping.processingOverrides,
                                deltaPercent: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end border-t pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm hover:bg-slate-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
