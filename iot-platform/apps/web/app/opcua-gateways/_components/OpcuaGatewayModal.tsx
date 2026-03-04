'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import {
  OpcuaGateway,
  CreateOpcuaGatewayInput,
  OpcuaNodeMapping,
  OpcuaSubscriptionSettings,
  OpcuaBrowseNode,
} from '@repo/types';
import { useApplications } from '@/lib/hooks/useApplications';
import { useDevices } from '@/lib/hooks/useDevices';
import { OpcuaBrowseModal } from './OpcuaBrowseModal';
import { Search } from 'lucide-react';

interface OpcuaGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateOpcuaGatewayInput) => Promise<void>;
  gateway?: OpcuaGateway | null;
  applicationId?: string;
  isLoading?: boolean;
}

type NodeMappingRow = OpcuaNodeMapping & { _tempId?: string };

const SECURITY_MODES = ['None', 'Sign', 'SignAndEncrypt'] as const;
const MONITORING_MODES = ['Polling', 'Subscription'] as const;
const DATA_TYPES = ['string', 'int16', 'uint16', 'int32', 'uint32', 'float', 'boolean', 'dateTime'] as const;

export function OpcuaGatewayModal({
  isOpen,
  onClose,
  onSubmit,
  gateway,
  applicationId: defaultAppId,
  isLoading,
}: OpcuaGatewayModalProps) {
  const { data: appsData } = useApplications({ limit: 100, offset: 0 });
  const applications = appsData?.data || [];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(defaultAppId || '');
  const [deviceId, setDeviceId] = useState('');

  // Fetch devices for the selected application
  const { data: devicesData } = useDevices({
    applicationId: selectedAppId || defaultAppId || '',
    limit: 100,
    offset: 0,
  });
  const devices = devicesData?.devices || [];

  // Connection fields
  const [endpointUrl, setEndpointUrl] = useState('opc.tcp://localhost:4840');
  const [securityMode, setSecurityMode] = useState<'None' | 'Sign' | 'SignAndEncrypt'>('None');
  const [securityPolicy, setSecurityPolicy] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Monitoring mode
  const [monitoringMode, setMonitoringMode] = useState<'Polling' | 'Subscription'>('Polling');
  const [pollingInterval, setPollingInterval] = useState('5000');

  // Subscription settings
  const [publishingInterval, setPublishingInterval] = useState('1000');
  const [maxNotificationsPerPublish, setMaxNotificationsPerPublish] = useState('0');
  const [priority, setPriority] = useState('0');
  const [samplingInterval, setSamplingInterval] = useState('1000');
  const [queueSize, setQueueSize] = useState('10');

  // Node mappings
  const [nodeMappings, setNodeMappings] = useState<NodeMappingRow[]>([]);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  const isEditMode = !!gateway;

  useEffect(() => {
    if (gateway && isOpen) {
      setName(gateway.name);
      setDescription(gateway.description || '');
      setSelectedAppId(gateway.applicationId || defaultAppId || '');
      setDeviceId(gateway.deviceId);
      setEndpointUrl(gateway.endpointUrl);
      setSecurityMode(gateway.securityMode);
      setSecurityPolicy(gateway.securityPolicy || '');
      setUsername(gateway.username || '');
      setPassword(gateway.password || '');
      setMonitoringMode(gateway.monitoringMode);
      setPollingInterval((gateway.pollingInterval || 5000).toString());
      const settings = gateway.subscriptionSettings || {};
      setPublishingInterval((settings.publishingInterval || 1000).toString());
      setMaxNotificationsPerPublish((settings.maxNotificationsPerPublish || 0).toString());
      setPriority((settings.priority || 0).toString());
      setSamplingInterval((settings.samplingInterval || 1000).toString());
      setQueueSize((settings.queueSize || 10).toString());
      setNodeMappings(
        gateway.nodeMappings.map((n, i) => ({ ...n, _tempId: i.toString() }))
      );
    } else if (isOpen) {
      setName('');
      setDescription('');
      setSelectedAppId(defaultAppId || '');
      setDeviceId('');
      setEndpointUrl('opc.tcp://localhost:4840');
      setSecurityMode('None');
      setSecurityPolicy('');
      setUsername('');
      setPassword('');
      setMonitoringMode('Polling');
      setPollingInterval('5000');
      setPublishingInterval('1000');
      setMaxNotificationsPerPublish('0');
      setPriority('0');
      setSamplingInterval('1000');
      setQueueSize('10');
      setNodeMappings([]);
    }
  }, [gateway, isOpen, defaultAppId]);

  const handleAddNodeMapping = () => {
    setNodeMappings([
      ...nodeMappings,
      {
        _tempId: Date.now().toString(),
        field: '',
        nodeId: '',
      },
    ]);
  };

  const handleRemoveNodeMapping = (tempId: string) => {
    setNodeMappings(nodeMappings.filter((n) => n._tempId !== tempId));
  };

  const handleUpdateNodeMapping = (tempId: string, field: string, value: any) => {
    setNodeMappings(
      nodeMappings.map((n) =>
        n._tempId === tempId ? { ...n, [field]: value } : n
      )
    );
  };

  const handleBrowseConfirm = (browseNodes: OpcuaBrowseNode[]) => {
    const existingNodeIds = nodeMappings.map((n) => n.nodeId);
    const newMappings = browseNodes
      .filter((node) => !existingNodeIds.includes(node.nodeId))
      .map((node) => ({
        _tempId: Date.now().toString() + Math.random(),
        field: node.displayName || node.browseName,
        nodeId: node.nodeId,
      }));

    setNodeMappings([...nodeMappings, ...newMappings]);
    setIsBrowseOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Gateway name is required');
      return;
    }
    if (!deviceId.trim()) {
      alert('Device ID is required');
      return;
    }
    if (!endpointUrl.trim()) {
      alert('Endpoint URL is required');
      return;
    }

    try {
      const subscriptionSettings: OpcuaSubscriptionSettings | undefined =
        monitoringMode === 'Subscription'
          ? {
              publishingInterval: parseInt(publishingInterval, 10),
              maxNotificationsPerPublish: parseInt(maxNotificationsPerPublish, 10),
              priority: parseInt(priority, 10),
              samplingInterval: parseInt(samplingInterval, 10),
              queueSize: parseInt(queueSize, 10),
            }
          : undefined;

      const payload: CreateOpcuaGatewayInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        applicationId: selectedAppId || undefined,
        deviceId: deviceId.trim(),
        endpointUrl: endpointUrl.trim(),
        securityMode,
        securityPolicy: securityPolicy.trim() || undefined,
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        monitoringMode,
        pollingInterval:
          monitoringMode === 'Polling' ? parseInt(pollingInterval, 10) : undefined,
        subscriptionSettings,
        nodeMappings: nodeMappings
          .filter((n) => n.field.trim() && n.nodeId.trim())
          .map(({ _tempId, ...rest }) => rest),
      };

      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error submitting gateway:', error);
      alert('Failed to save gateway');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit OPC-UA Gateway' : 'Create OPC-UA Gateway'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gateway Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Factory PLC"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Application
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="">-- Select Application --</option>
              {applications.map((app: any, idx: number) => (
                <option key={app.id || idx} value={app.applicationId}>
                  {app.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Device Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Device <span className="text-red-500">*</span>
          </label>
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            required
          >
            <option value="">-- Select Device --</option>
            {devices.map((dev: any) => (
              <option key={dev.deviceId} value={dev.deviceId}>
                {dev.name}
              </option>
            ))}
          </select>
        </div>

        {/* Connection Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Endpoint URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            placeholder="opc.tcp://hostname:4840"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            required
          />
        </div>

        {/* Security Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Security Mode
            </label>
            <select
              value={securityMode}
              onChange={(e) => setSecurityMode(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            >
              {SECURITY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Security Policy
            </label>
            <input
              type="text"
              value={securityPolicy}
              onChange={(e) => setSecurityPolicy(e.target.value)}
              placeholder="e.g., Basic256Sha256"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Credentials (Optional) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Monitoring Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Monitoring Mode
          </label>
          <div className="flex gap-4">
            {MONITORING_MODES.map((mode) => (
              <label key={mode} className="flex items-center gap-2">
                <input
                  type="radio"
                  value={mode}
                  checked={monitoringMode === mode}
                  onChange={(e) => setMonitoringMode(e.target.value as any)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{mode}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Conditional Monitoring Settings */}
        {monitoringMode === 'Polling' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Polling Interval (ms)
            </label>
            <input
              type="number"
              min="100"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Publishing Interval (ms)
              </label>
              <input
                type="number"
                min="100"
                value={publishingInterval}
                onChange={(e) => setPublishingInterval(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sampling Interval (ms)
              </label>
              <input
                type="number"
                min="100"
                value={samplingInterval}
                onChange={(e) => setSamplingInterval(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Notifications Per Publish
              </label>
              <input
                type="number"
                min="0"
                value={maxNotificationsPerPublish}
                onChange={(e) => setMaxNotificationsPerPublish(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Queue Size
              </label>
              <input
                type="number"
                min="1"
                value={queueSize}
                onChange={(e) => setQueueSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Node Mappings */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Node Mappings
            </label>
            <div className="flex gap-2">
              {isEditMode && gateway?.id && (
                <button
                  type="button"
                  onClick={() => setIsBrowseOpen(true)}
                  className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-800 flex items-center gap-1"
                  title="Browse server nodes"
                >
                  <Search className="h-3 w-3" />
                  Browse
                </button>
              )}
              <button
                type="button"
                onClick={handleAddNodeMapping}
                className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-800"
              >
                + Add Node
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nodeMappings.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No node mappings — click "Add Node" to map OPC-UA nodes.
              </p>
            ) : (
              nodeMappings.map((node) => (
                <div key={node._tempId} className="flex gap-2 items-center text-sm">
                  <input
                    type="text"
                    value={node.field}
                    onChange={(e) =>
                      handleUpdateNodeMapping(node._tempId!, 'field', e.target.value)
                    }
                    placeholder="Field name"
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    value={node.nodeId}
                    onChange={(e) =>
                      handleUpdateNodeMapping(node._tempId!, 'nodeId', e.target.value)
                    }
                    placeholder="ns=2;i=100"
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <select
                    value={node.dataType || ''}
                    onChange={(e) =>
                      handleUpdateNodeMapping(node._tempId!, 'dataType', e.target.value || undefined)
                    }
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">-- Type --</option>
                    {DATA_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={node.scale || ''}
                    onChange={(e) =>
                      handleUpdateNodeMapping(
                        node._tempId!,
                        'scale',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="Scale"
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveNodeMapping(node._tempId!)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
          </button>
        </div>
      </form>

      {/* Browse Modal */}
      {isEditMode && gateway?.id && (
        <OpcuaBrowseModal
          isOpen={isBrowseOpen}
          onClose={() => setIsBrowseOpen(false)}
          gatewayId={gateway.id}
          onConfirm={handleBrowseConfirm}
        />
      )}
    </Modal>
  );
}
