'use client';

import { OpcuaGateway } from '@repo/types';
import { X, Zap, Play, Square, RotateCw } from 'lucide-react';
import { useGetStatistics } from '@/lib/hooks/useOpcuaGateways';

interface OpcuaGatewayDetailPanelProps {
  gateway: OpcuaGateway | null;
  onClose: () => void;
  onStart: (gateway: OpcuaGateway) => void;
  onStop: (gateway: OpcuaGateway) => void;
  onTest: (gateway: OpcuaGateway) => void;
  isStarting?: boolean;
  isStopping?: boolean;
  isTesting?: boolean;
}

export function OpcuaGatewayDetailPanel({
  gateway,
  onClose,
  onStart,
  onStop,
  onTest,
  isStarting,
  isStopping,
  isTesting,
}: OpcuaGatewayDetailPanelProps) {
  const { data: stats } = useGetStatistics(gateway?.id || '');

  if (!gateway) return null;

  const getConnectionColor = (isConnected: boolean) => {
    return isConnected
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  };

  const successRate = gateway.totalReads > 0
    ? ((gateway.successfulReads / gateway.totalReads) * 100).toFixed(1)
    : 'N/A';

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50">
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Gateway Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Gateway Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {gateway.name}
            </h3>
            {gateway.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {gateway.description}
              </p>
            )}
          </div>

          {/* Connection Status Card */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connection Status
              </p>
              <p className={`text-lg font-semibold ${getConnectionColor(gateway.isConnected)}`}>
                {gateway.isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {gateway.isActive ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Consecutive Failures
                </p>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {gateway.consecutiveFailures || 0}
                </p>
              </div>
            </div>

            {gateway.lastError && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last Error
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 break-words">
                  {gateway.lastError}
                </p>
              </div>
            )}
          </div>

          {/* Connection Config */}
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              CONNECTION
            </p>
            <div className="space-y-1 text-gray-700 dark:text-gray-300">
              <p>
                <span className="text-gray-500 dark:text-gray-400">Endpoint:</span>{' '}
                <span className="font-mono text-xs break-all">{gateway.endpointUrl}</span>
              </p>
              <p>
                <span className="text-gray-500 dark:text-gray-400">Security Mode:</span>{' '}
                {gateway.securityMode}
              </p>
              {gateway.securityPolicy && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">
                    Security Policy:
                  </span>{' '}
                  {gateway.securityPolicy}
                </p>
              )}
              {gateway.username && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">User:</span>{' '}
                  {gateway.username}
                </p>
              )}
            </div>
          </div>

          {/* Monitoring Config */}
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              MONITORING
            </p>
            <div className="space-y-1 text-gray-700 dark:text-gray-300">
              <p>
                <span className="text-gray-500 dark:text-gray-400">Mode:</span>{' '}
                {gateway.monitoringMode}
              </p>
              {gateway.monitoringMode === 'Polling' && gateway.pollingInterval && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Interval:</span>{' '}
                  {gateway.pollingInterval}ms
                </p>
              )}
              {gateway.monitoringMode === 'Subscription' &&
                gateway.subscriptionSettings && (
                  <>
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">
                        Publishing Interval:
                      </span>{' '}
                      {gateway.subscriptionSettings.publishingInterval}ms
                    </p>
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">
                        Sampling Interval:
                      </span>{' '}
                      {gateway.subscriptionSettings.samplingInterval}ms
                    </p>
                  </>
                )}
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              STATISTICS
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Reads</p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {gateway.totalReads || 0}
                </p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <p className="text-xs text-gray-500 dark:text-gray-400">Successful</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {gateway.successfulReads || 0}
                </p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {gateway.failedReads || 0}
                </p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {successRate}%
                </p>
              </div>
            </div>
            {gateway.averageResponseTime && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="text-gray-500">Avg Response Time:</span>{' '}
                {gateway.averageResponseTime.toFixed(2)}ms
              </p>
            )}
          </div>

          {/* Node Mappings */}
          {gateway.nodeMappings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                NODE MAPPINGS ({gateway.nodeMappings.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {gateway.nodeMappings.map((node, i) => (
                  <div
                    key={i}
                    className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300"
                  >
                    <p className="font-medium">{node.field}</p>
                    <p className="text-gray-500 dark:text-gray-400 font-mono">
                      {node.nodeId}
                    </p>
                    {node.dataType && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {node.dataType}
                        {node.scale && ` (scale: ${node.scale})`}
                        {node.unit && ` [${node.unit}]`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          {(gateway.lastPollTimestamp ||
            gateway.lastSuccessTimestamp ||
            gateway.lastErrorTimestamp) && (
            <div className="space-y-2 text-sm">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                TIMESTAMPS
              </p>
              <div className="space-y-1 text-gray-700 dark:text-gray-300 text-xs">
                {gateway.lastPollTimestamp && (
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Last Poll:</span>{' '}
                    {new Date(gateway.lastPollTimestamp).toLocaleString()}
                  </p>
                )}
                {gateway.lastSuccessTimestamp && (
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">
                      Last Success:
                    </span>{' '}
                    {new Date(gateway.lastSuccessTimestamp).toLocaleString()}
                  </p>
                )}
                {gateway.lastErrorTimestamp && (
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">
                      Last Error:
                    </span>{' '}
                    {new Date(gateway.lastErrorTimestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
          <button
            onClick={() => onTest(gateway)}
            disabled={isTesting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 disabled:opacity-50 font-medium text-sm"
          >
            <Zap className="h-4 w-4" />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <div className="flex gap-2">
            {gateway.isActive ? (
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
