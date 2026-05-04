'use client';

import { OpcuaGateway } from '@repo/types';
import { Edit2, Trash2, Play, Square, Zap, Loader2 } from 'lucide-react';

interface OpcuaGatewayTableProps {
  gateways: OpcuaGateway[];
  isLoading?: boolean;
  isTesting?: boolean;
  testingGatewayId?: string | null;
  onEdit: (gateway: OpcuaGateway) => void;
  onDelete: (gatewayId: string) => void;
  onStart: (gateway: OpcuaGateway) => void;
  onStop: (gateway: OpcuaGateway) => void;
  onTest: (gateway: OpcuaGateway) => void;
  onDetail: (gateway: OpcuaGateway) => void;
}

export function OpcuaGatewayTable({
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
}: OpcuaGatewayTableProps) {
  if (gateways.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-slate-200 dark:border-slate-700">
        <p className="text-gray-600 dark:text-slate-400">
          No OPC-UA gateways configured
        </p>
      </div>
    );
  }

  const getStatusColor = (isConnected: boolean) => {
    return isConnected
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-slate-100 text-gray-800 dark:bg-gray-700 dark:text-slate-300';
  };

  const getSecurityModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      'None': 'None',
      'Sign': 'Sign',
      'SignAndEncrypt': 'Sign & Encrypt',
    };
    return labels[mode] || mode;
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Endpoint URL
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Security Mode
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Monitoring
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Total Reads
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
              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => onDetail(gateway)}
            >
              <td className="px-4 py-3 font-medium text-indigo-600 hover:text-indigo-700 dark:text-blue-400">
                {gateway.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400 truncate max-w-xs">
                {gateway.endpointUrl}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                {getSecurityModeLabel(gateway.securityMode)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                {gateway.monitoringMode}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(gateway.isConnected)}`}
                >
                  {gateway.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                {gateway.totalReads || 0}
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
                    {isTesting && testingGatewayId === gateway.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                  </button>
                  {gateway.isActive ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStop(gateway);
                      }}
                      title="Stop gateway"
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
                      title="Start gateway"
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
                    className="text-indigo-600 hover:text-indigo-700 dark:text-blue-400 p-1"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(gateway.id);
                    }}
                    title="Delete"
                    className="text-rose-600 hover:text-red-700 dark:text-red-400 p-1"
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
