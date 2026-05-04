'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { ModbusGateway, CreateModbusGatewayInput, ModbusRegister } from '@repo/types';
import { useApplications } from '@/lib/hooks/useApplications';
import { useDevices } from '@/lib/hooks/useDevices';

interface GatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateModbusGatewayInput) => Promise<void>;
  gateway?: ModbusGateway | null;
  applicationId?: string;
  isLoading?: boolean;
}

type RegisterRow = ModbusRegister & { _tempId?: string };

const REGISTER_TYPES = ['holding', 'input', 'coil', 'discrete'] as const;
const DATA_TYPES = [
  'int16',
  'uint16',
  'int32',
  'uint32',
  'float',
  'boolean',
] as const;

export function GatewayModal({
  isOpen,
  onClose,
  onSubmit,
  gateway,
  applicationId: defaultAppId,
  isLoading,
}: GatewayModalProps) {
  const { data: appsData } = useApplications({ limit: 100, offset: 0 });
  const applications = appsData?.data || [];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(defaultAppId || '');
  const [protocol, setProtocol] = useState<'tcp' | 'rtu'>('tcp');

  // Fetch devices for the selected application
  const { data: devicesData } = useDevices({
    applicationId: selectedAppId || defaultAppId || '',
    limit: 100,
    offset: 0,
  });
  const devices = devicesData?.devices || [];

  // TCP fields
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('502');

  // RTU fields
  const [serialPort, setSerialPort] = useState('/dev/ttyUSB0');
  const [baudRate, setBaudRate] = useState('9600');

  // Common
  const [unitId, setUnitId] = useState('1');
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pollingInterval, setPollingInterval] = useState('5000');
  const [registers, setRegisters] = useState<RegisterRow[]>([]);

  const isEditMode = !!gateway;

  useEffect(() => {
    if (gateway && isOpen) {
      setName(gateway.name);
      setDescription(gateway.description || '');
      setSelectedAppId(gateway.applicationId || defaultAppId || '');
      setProtocol((gateway.protocol || 'tcp') as 'tcp' | 'rtu');
      setHost(gateway.connection.host || 'localhost');
      setPort((gateway.connection.port || 502).toString());
      setSerialPort(gateway.connection.serialPort || '/dev/ttyUSB0');
      setBaudRate((gateway.connection.baudRate || 9600).toString());
      setUnitId((gateway.connection.unitId || 1).toString());
      setPollingEnabled(gateway.polling.enabled);
      setPollingInterval(gateway.polling.interval.toString());
      setRegisters(
        gateway.registers.map((r, i) => ({ ...r, _tempId: i.toString() }))
      );
    } else if (isOpen) {
      setName('');
      setDescription('');
      setSelectedAppId(defaultAppId || '');
      setProtocol('tcp');
      setHost('localhost');
      setPort('502');
      setSerialPort('/dev/ttyUSB0');
      setBaudRate('9600');
      setUnitId('1');
      setPollingEnabled(true);
      setPollingInterval('5000');
      setRegisters([]);
    }
  }, [gateway, isOpen, defaultAppId]);

  const handleAddRegister = () => {
    setRegisters([
      ...registers,
      {
        _tempId: Date.now().toString(),
        name: '',
        address: 0,
        type: 'holding',
        dataType: 'int16',
      },
    ]);
  };

  const handleRemoveRegister = (tempId: string) => {
    setRegisters(registers.filter((r) => r._tempId !== tempId));
  };

  const handleUpdateRegister = (
    tempId: string,
    field: string,
    value: any
  ) => {
    setRegisters(
      registers.map((r) =>
        r._tempId === tempId ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Gateway name is required');
      return;
    }

    try {
      const payload: CreateModbusGatewayInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        applicationId: selectedAppId || undefined,
        protocol,
        connection: {
          unitId: parseInt(unitId, 10),
          ...(protocol === 'tcp' && {
            host,
            port: parseInt(port, 10),
          }),
          ...(protocol === 'rtu' && {
            serialPort,
            baudRate: parseInt(baudRate, 10),
          }),
        },
        polling: {
          enabled: pollingEnabled,
          interval: parseInt(pollingInterval, 10),
        },
        registers: registers
          .filter((r) => r.name.trim())
          .map(({ _tempId, ...rest }) => rest),
        deviceMapping: {
          autoRegister: true,
          deviceIdPrefix: 'MODBUS_',
        },
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
      title={isEditMode ? 'Edit Gateway' : 'Create Gateway'}
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
              placeholder="e.g., Water Pump Sensors"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Protocol Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Protocol
          </label>
          <div className="flex gap-4">
            {(['tcp', 'rtu'] as const).map((p) => (
              <label key={p} className="flex items-center gap-2">
                <input
                  type="radio"
                  value={p}
                  checked={protocol === p}
                  onChange={(e) => setProtocol(e.target.value as 'tcp' | 'rtu')}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{p.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Connection Config */}
        {protocol === 'tcp' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Host
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost or IP"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Serial Port
              </label>
              <input
                type="text"
                value={serialPort}
                onChange={(e) => setSerialPort(e.target.value)}
                placeholder="/dev/ttyUSB0 or COM3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Baud Rate
              </label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                {[9600, 19200, 38400, 57600, 115200].map((br) => (
                  <option key={br} value={br}>
                    {br}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Unit ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slave ID / Unit ID
          </label>
          <input
            type="number"
            min="1"
            max="247"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Polling Config */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pollingEnabled}
              onChange={(e) => setPollingEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Enable Polling
            </span>
          </label>
          {pollingEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interval (ms)
              </label>
              <input
                type="number"
                min="100"
                value={pollingInterval}
                onChange={(e) => setPollingInterval(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Registers */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Registers
            </label>
            <button
              type="button"
              onClick={handleAddRegister}
              className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-800"
            >
              + Add Register
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {registers.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No registers — click "Add Register" to define them.
              </p>
            ) : (
              registers.map((reg) => (
                <div
                  key={reg._tempId}
                  className="flex gap-2 items-center text-sm"
                >
                  <input
                    type="text"
                    value={reg.name}
                    onChange={(e) =>
                      handleUpdateRegister(reg._tempId!, 'name', e.target.value)
                    }
                    placeholder="Name"
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="number"
                    value={reg.address}
                    onChange={(e) =>
                      handleUpdateRegister(reg._tempId!, 'address', parseInt(e.target.value, 10))
                    }
                    placeholder="Addr"
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <select
                    value={reg.type}
                    onChange={(e) =>
                      handleUpdateRegister(reg._tempId!, 'type', e.target.value)
                    }
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    {REGISTER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={reg.dataType}
                    onChange={(e) =>
                      handleUpdateRegister(reg._tempId!, 'dataType', e.target.value)
                    }
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    {DATA_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={reg.deviceId || ''}
                    onChange={(e) =>
                      handleUpdateRegister(reg._tempId!, 'deviceId', e.target.value || undefined)
                    }
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-indigo-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    title="Map to device (optional)"
                  >
                    <option value="">-- Device --</option>
                    {devices.map((dev: any) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveRegister(reg._tempId!)}
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
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
