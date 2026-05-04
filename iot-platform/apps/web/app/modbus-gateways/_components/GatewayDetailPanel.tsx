'use client';

import { ModbusGateway } from '@repo/types';
import { X, Zap, Play, Square } from 'lucide-react';
import { useGatewayStatus } from '@/lib/hooks/useModbusGateways';

interface GatewayDetailPanelProps {
  gateway: ModbusGateway | null;
  onClose: () => void;
  onStart: (gateway: ModbusGateway) => void;
  onStop: (gateway: ModbusGateway) => void;
  onTest: (gateway: ModbusGateway) => void;
  isStarting?: boolean;
  isStopping?: boolean;
  isTesting?: boolean;
}

export function GatewayDetailPanel({
  gateway,
  onClose,
  onStart,
  onStop,
  onTest,
  isStarting,
  isStopping,
  isTesting,
}: GatewayDetailPanelProps) {
  const { data: status } = useGatewayStatus(gateway?.id || '');

  if (!gateway) return null;

  const isPolling = gateway.polling?.enabled;
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'connected':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-rose-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-slate-400';
    }
  };

  const getConnectionString = () => {
    const { connection } = gateway;
    if (gateway.protocol === 'tcp') {
      return `${connection.host}:${connection.port}`;
    }
    return `${connection.serialPort} @ ${connection.baudRate}bps`;
  };

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50">
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Gateway Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Gateway Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {gateway.name}
            </h3>
            {gateway.description && (
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {gateway.description}
              </p>
            )}
          </div>

          {/* Status Card */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
              <p className={`text-lg font-semibold ${getStatusColor(gateway.status)}`}>
                {gateway.status}
              </p>
            </div>
            {gateway.lastConnected && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Last Connected
                </p>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  {new Date(gateway.lastConnected).toLocaleString()}
                </p>
              </div>
            )}
            {gateway.lastError && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Last Error
                </p>
                <p className="text-sm text-rose-600 dark:text-red-400">
                  {gateway.lastError}
                </p>
              </div>
            )}
          </div>

          {/* Connection Config */}
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">
              CONNECTION
            </p>
            <div className="space-y-1 text-gray-700 dark:text-slate-300">
              <p>
                <span className="text-slate-500 dark:text-slate-400">Protocol:</span>{' '}
                {gateway.protocol?.toUpperCase()}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">Address:</span>{' '}
                {getConnectionString()}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">Slave ID:</span>{' '}
                {gateway.connection.unitId}
              </p>
            </div>
          </div>

          {/* Polling Config */}
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">
              POLLING
            </p>
            <div className="space-y-1 text-gray-700 dark:text-slate-300">
              <p>
                <span className="text-slate-500 dark:text-slate-400">Status:</span>{' '}
                {isPolling ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    Enabled
                  </span>
                ) : (
                  <span className="text-slate-500">Disabled</span>
                )}
              </p>
              {isPolling && (
                <p>
                  <span className="text-slate-500 dark:text-slate-400">
                    Interval:
                  </span>{' '}
                  {gateway.polling.interval}ms
                </p>
              )}
            </div>
          </div>

          {/* Registers */}
          {gateway.registers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">
                REGISTERS ({gateway.registers.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {gateway.registers.map((reg, i) => (
                  <div
                    key={i}
                    className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded text-gray-700 dark:text-slate-300"
                  >
                    <p className="font-medium">{reg.name}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {reg.type} @ {reg.address} ({reg.dataType})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <button
            onClick={() => onTest(gateway)}
            disabled={isTesting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 disabled:opacity-50 font-medium text-sm"
          >
            <Zap className="h-4 w-4" />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <div className="flex gap-2">
            {isPolling ? (
              <button
                onClick={() => onStop(gateway)}
                disabled={isStopping}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800 disabled:opacity-50 font-medium text-sm"
              >
                <Square className="h-4 w-4" />
                {isStopping ? 'Stopping...' : 'Stop'}
              </button>
            ) : (
              <button
                onClick={() => onStart(gateway)}
                disabled={isStarting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 font-medium text-sm"
              >
                <Play className="h-4 w-4" />
                {isStarting ? 'Starting...' : 'Start'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
