'use client';

import { EnipGateway } from '@repo/types';
import { X, Zap, Play, Square } from 'lucide-react';
import { useEnipGatewayStatus } from '@/lib/hooks/useEnipGateways';

interface Props {
  gateway: EnipGateway | null;
  onClose: () => void;
  onStart: (g: EnipGateway) => void;
  onStop: (g: EnipGateway) => void;
  onTest: (g: EnipGateway) => void;
  isStarting?: boolean;
  isStopping?: boolean;
  isTesting?: boolean;
}

const statusColor = (s: string) => {
  if (s === 'connected') return 'text-green-600 dark:text-green-400';
  if (s === 'error') return 'text-rose-600 dark:text-red-400';
  return 'text-gray-600 dark:text-slate-400';
};

export function EnipGatewayDetailPanel({ gateway, onClose, onStart, onStop, onTest, isStarting, isStopping, isTesting }: Props) {
  const { data: runtime } = useEnipGatewayStatus(gateway?.id || '');
  if (!gateway) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50">
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 shadow-lg flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">EtherNet/IP Gateway</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-gray-700 dark:text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{gateway.name}</h3>
            {gateway.description && <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{gateway.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Host</span>
              <span className="font-medium text-slate-900 dark:text-white">{gateway.host}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Port</span>
              <span className="font-medium text-slate-900 dark:text-white">{gateway.port ?? 44818}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">CPU Slot</span>
              <span className="font-medium text-slate-900 dark:text-white">{gateway.slot ?? 0}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Status</span>
              <span className={`font-medium ${statusColor(gateway.status)}`}>{gateway.status}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Polling</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {gateway.polling?.enabled ? `${gateway.polling.interval}ms` : 'Disabled'}
              </span>
            </div>
          </div>

          {gateway.lastError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">Last Error</p>
              <p className="text-xs text-rose-600 dark:text-red-400 mt-1">{gateway.lastError}</p>
            </div>
          )}

          {gateway.tags?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                CIP Tags ({gateway.tags.length})
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {gateway.tags.map((tag, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-slate-400 border-b border-gray-100 dark:border-gray-800 pb-1">
                    <span className="font-medium">{tag.field}</span>
                    <span className="font-mono text-slate-500">{tag.tagName}{tag.dataType ? ` [${tag.dataType}]` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {runtime && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Runtime: {runtime.running ? 'running' : 'stopped'} / {runtime.connected ? 'connected' : 'not connected'}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <button onClick={() => onTest(gateway)} disabled={isTesting}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-yellow-300 text-yellow-700 dark:text-yellow-400 text-sm hover:bg-yellow-50 disabled:opacity-50">
            <Zap className="h-4 w-4" />{isTesting ? 'Testing…' : 'Test'}
          </button>
          {gateway.polling?.enabled ? (
            <button onClick={() => onStop(gateway)} disabled={isStopping}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-orange-300 text-orange-700 dark:text-orange-400 text-sm hover:bg-orange-50 disabled:opacity-50">
              <Square className="h-4 w-4" />{isStopping ? 'Stopping…' : 'Stop'}
            </button>
          ) : (
            <button onClick={() => onStart(gateway)} disabled={isStarting}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-green-300 text-green-700 dark:text-green-400 text-sm hover:bg-green-50 disabled:opacity-50">
              <Play className="h-4 w-4" />{isStarting ? 'Starting…' : 'Start'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
