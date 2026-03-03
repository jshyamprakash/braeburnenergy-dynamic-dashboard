'use client';

import { ModbusGateway } from '@repo/types';
import { Edit2, Trash2, Play, Square, Zap, Loader2 } from 'lucide-react';

interface GatewayTableProps {
  gateways: ModbusGateway[];
  isLoading?: boolean;
  isTesting?: boolean;
  testingGatewayId?: string | null;
  onEdit: (gateway: ModbusGateway) => void;
  onDelete: (gatewayId: string) => void;
  onStart: (gateway: ModbusGateway) => void;
  onStop: (gateway: ModbusGateway) => void;
  onTest: (gateway: ModbusGateway) => void;
  onDetail: (gateway: ModbusGateway) => void;
}

export function GatewayTable({
  gateways,
  isLoading,
  isTesting,
  testingGatewayId,
  onEdit,
  onDelete,
  onStart,
  onStop,
  onTest,
  onDetail,
}: GatewayTableProps) {
  if (gateways.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">
          No Modbus gateways configured
        </p>
      </div>
    );
  }

  const isPolling = (gateway: ModbusGateway) =>
    gateway.polling?.enabled;

  const getConnectionString = (gateway: ModbusGateway) => {
    const { connection } = gateway;
    if (gateway.protocol === 'tcp') {
      return `${connection.host}:${connection.port}`;
    }
    return connection.serialPort || 'RTU';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Protocol
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Connection
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Polling
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {gateways.map((gateway, index) => (
            <tr
              key={gateway.id || index}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => onDetail(gateway)}
            >
              <td className="px-4 py-3 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                {gateway.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {gateway.protocol?.toUpperCase()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {getConnectionString(gateway)}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(gateway.status)}`}
                >
                  {gateway.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {isPolling(gateway) ? (
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                    <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full" />
                    {gateway.polling.interval}ms
                  </span>
                ) : (
                  <span className="text-gray-400">Disabled</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTest(gateway);
                    }}
                    title="Test connection"
                    className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 p-1"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                  {isPolling(gateway) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStop(gateway);
                      }}
                      title="Stop polling"
                      className="text-orange-600 hover:text-orange-700 dark:text-orange-400 p-1"
                    >
                      <Square className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(gateway);
                      }}
                      title="Start polling"
                      className="text-green-600 hover:text-green-700 dark:text-green-400 p-1"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(gateway);
                    }}
                    title="Edit"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(gateway.id);
                    }}
                    title="Delete"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
