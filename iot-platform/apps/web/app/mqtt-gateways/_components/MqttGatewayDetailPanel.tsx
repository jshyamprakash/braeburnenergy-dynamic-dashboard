'use client';

import { MqttGateway } from '@repo/types';
import { X, Zap, Play, Square } from 'lucide-react';
import { useMqttGatewayStatus } from '@/lib/hooks/useMqttGateways';

interface MqttGatewayDetailPanelProps {
  gateway: MqttGateway | null;
  onClose: () => void;
  onStart: (gateway: MqttGateway) => void;
  onStop: (gateway: MqttGateway) => void;
  onTest: (gateway: MqttGateway) => void;
  isStarting?: boolean;
  isStopping?: boolean;
  isTesting?: boolean;
}

export function MqttGatewayDetailPanel({
  gateway,
  onClose,
  onStart,
  onStop,
  onTest,
  isStarting,
  isStopping,
  isTesting,
}: MqttGatewayDetailPanelProps) {
  const { data: status } = useMqttGatewayStatus(gateway?.id || '');

  if (!gateway) return null;

  const isConnected = status?.connected;
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

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50">
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gateway Details</h2>
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
            <h3 className="font-semibold text-slate-900 dark:text-white">{gateway.name}</h3>
            {gateway.description && (
              <p className="text-sm text-gray-600 dark:text-slate-400">{gateway.description}</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Last Connected</p>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  {new Date(gateway.lastConnected).toLocaleString()}
                </p>
              </div>
            )}
            {gateway.lastMessageAt && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Last Message</p>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  {new Date(gateway.lastMessageAt).toLocaleString()}
                </p>
              </div>
            )}
            {gateway.lastError && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Last Error</p>
                <p className="text-sm text-rose-600 dark:text-red-400">{gateway.lastError}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Messages Received</p>
              <p className="text-sm text-gray-700 dark:text-slate-300">
                {gateway.totalMessagesReceived || 0}
              </p>
            </div>
          </div>

          {/* Broker Config */}
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">BROKER CONFIG</p>
            <div className="space-y-1 text-gray-700 dark:text-slate-300">
              <p>
                <span className="text-slate-500 dark:text-slate-400">URL:</span> {gateway.brokerUrl}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">Client ID:</span>{' '}
                {gateway.clientId || '(auto-generated)'}
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">Keepalive:</span>{' '}
                {gateway.keepalive}s
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">Connect Timeout:</span>{' '}
                {gateway.connectTimeout}ms
              </p>
            </div>
          </div>

          {/* Topic Subscriptions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">
              SUBSCRIPTIONS ({gateway.topicMappings?.length || 0})
            </p>
            <div className="space-y-1 text-xs">
              {gateway.topicMappings && gateway.topicMappings.length > 0 ? (
                gateway.topicMappings.map((m, i) => (
                  <div key={i} className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
                    <p className="font-mono text-gray-700 dark:text-slate-300">{m.topic}</p>
                    <p className="text-gray-600 dark:text-slate-400">
                      → {m.field} (QoS {m.qos})
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 dark:text-slate-400">No subscriptions</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <button
            onClick={() => onTest(gateway)}
            disabled={isTesting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          {isConnected ? (
            <button
              onClick={() => onStop(gateway)}
              disabled={isStopping}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              {isStopping ? 'Disconnecting...' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={() => onStart(gateway)}
              disabled={isStarting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {isStarting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
