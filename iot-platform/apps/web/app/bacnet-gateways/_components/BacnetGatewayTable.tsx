'use client';

import { BacnetGateway } from '@repo/types';
import { Edit2, Trash2, Play, Square, Zap } from 'lucide-react';

interface Props {
  gateways: BacnetGateway[];
  onEdit: (g: BacnetGateway) => void;
  onDelete: (id: string) => void;
  onStart: (g: BacnetGateway) => void;
  onStop: (g: BacnetGateway) => void;
  onTest: (g: BacnetGateway) => void;
  onDetail: (g: BacnetGateway) => void;
}

const statusColor = (s: string) => {
  if (s === 'connected') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (s === 'error') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

export function BacnetGatewayTable({ gateways, onEdit, onDelete, onStart, onStop, onTest, onDetail }: Props) {
  if (gateways.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">No BACnet gateways configured</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Host</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Port</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Objects</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {gateways.map((gw, i) => (
            <tr
              key={gw.id || i}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => onDetail(gw)}
            >
              <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">{gw.name}</td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{gw.host}</td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{gw.port ?? 47808}</td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{gw.objects?.length ?? 0}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColor(gw.status)}`}>
                  {gw.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => { e.stopPropagation(); onTest(gw); }} title="Test" className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 p-1">
                    <Zap className="h-4 w-4" />
                  </button>
                  {gw.polling?.enabled ? (
                    <button onClick={(e) => { e.stopPropagation(); onStop(gw); }} title="Stop" className="text-orange-600 hover:text-orange-700 p-1">
                      <Square className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); onStart(gw); }} title="Start" className="text-green-600 hover:text-green-700 p-1">
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onEdit(gw); }} title="Edit" className="text-blue-600 hover:text-blue-700 p-1">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(gw.id); }} title="Delete" className="text-red-600 hover:text-red-700 p-1">
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
