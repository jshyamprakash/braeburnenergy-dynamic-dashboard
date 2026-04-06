'use client';

import { useAppSelector } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSystemHealth } from '@/lib/hooks/useSystemHealth';
import { Activity, AlertCircle } from 'lucide-react';

type StatusLevel = 'green' | 'amber' | 'red';

function StatusCard({
  title,
  status,
  details,
}: {
  title: string;
  status: StatusLevel;
  details: React.ReactNode;
}) {
  const statusColor = {
    green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300',
    red: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300',
  };
  const statusText = { green: '✓ Healthy', amber: '⚠ Degraded', red: '✗ Down' };
  const statusBg = {
    green: 'bg-green-600',
    amber: 'bg-amber-600',
    red: 'bg-red-600',
  };

  return (
    <div className={`border rounded-lg p-4 ${statusColor[status]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full ${statusBg[status]}`} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="text-sm space-y-1">{details}</div>
    </div>
  );
}

export default function SystemHealthPage() {
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const { data, isLoading, error } = useSystemHealth(30000);

  // Gate: Admin + only
  useEffect(() => {
    if (user && !['Admin', 'SuperAdmin'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || !['Admin', 'SuperAdmin'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 flex items-center justify-center">
        <div className="text-red-500 dark:text-red-400">
          Access denied. Admin or SuperAdmin role required.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Health</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Live infrastructure status — updates every 30 seconds
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading system health...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Failed to load system health: {error instanceof Error ? error.message : 'Unknown error'}</span>
          </div>
        )}

        {/* Health data */}
        {data && (
          <>
            {/* Overall status banner */}
            <div
              className={`rounded-lg border p-4 ${
                data.overall === 'green'
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                  : data.overall === 'amber'
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                    : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <div
                  className={`w-3 h-3 rounded-full ${
                    data.overall === 'green'
                      ? 'bg-green-600'
                      : data.overall === 'amber'
                        ? 'bg-amber-600'
                        : 'bg-red-600'
                  }`}
                />
                Overall:{' '}
                {data.overall === 'green' ? '✓ Healthy' : data.overall === 'amber' ? '⚠ Degraded' : '✗ Down'}
              </div>
            </div>

            {/* 5 status cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* NATS */}
              <StatusCard
                title="NATS JetStream"
                status={data.nats.status}
                details={
                  data.nats.error ? (
                    <div className="text-xs">{data.nats.error}</div>
                  ) : (
                    <>
                      <div>
                        <strong>sensor_raw:</strong> {data.nats.streams?.[0]?.messages ?? '-'} msgs
                      </div>
                      <div>
                        <strong>sensor_processed:</strong> {data.nats.streams?.[1]?.messages ?? '-'} msgs
                      </div>
                    </>
                  )
                }
              />

              {/* Redis */}
              <StatusCard
                title="Redis"
                status={data.redis.status}
                details={
                  data.redis.error ? (
                    <div className="text-xs">{data.redis.error}</div>
                  ) : (
                    <>
                      <div>
                        <strong>Latency:</strong> {data.redis.latencyMs ?? '-'}ms
                      </div>
                      <div>
                        <strong>Memory:</strong> {data.redis.memoryUsed ?? '-'}
                      </div>
                    </>
                  )
                }
              />

              {/* BullMQ */}
              <StatusCard
                title="BullMQ Queue"
                status={data.bullmq.status}
                details={
                  data.bullmq.error ? (
                    <div className="text-xs">{data.bullmq.error}</div>
                  ) : (
                    <>
                      <div>
                        <strong>Waiting:</strong> {data.bullmq.waiting ?? 0}
                      </div>
                      <div>
                        <strong>Active:</strong> {data.bullmq.active ?? 0}
                      </div>
                      <div>
                        <strong>Failed:</strong> {data.bullmq.failed ?? 0}
                      </div>
                    </>
                  )
                }
              />

              {/* MongoDB */}
              <StatusCard
                title="MongoDB"
                status={data.mongodb.status}
                details={
                  data.mongodb.error ? (
                    <div className="text-xs">{data.mongodb.error}</div>
                  ) : (
                    <>
                      <div>
                        <strong>Role:</strong> {data.mongodb.isPrimary ? 'Primary' : 'Secondary'}
                      </div>
                      <div className="text-xs">
                        <strong>ReplicaSet:</strong> {data.mongodb.replicaSet ?? '-'}
                      </div>
                    </>
                  )
                }
              />

              {/* Gateways */}
              <StatusCard
                title="Gateways"
                status={data.gateways.status}
                details={
                  <>
                    <div>
                      <strong>Connected:</strong> {data.gateways.total}
                    </div>
                    <div className="text-xs space-y-0.5 mt-1">
                      {data.gateways.modbus > 0 && <div>Modbus: {data.gateways.modbus}</div>}
                      {data.gateways.opcua > 0 && <div>OPC-UA: {data.gateways.opcua}</div>}
                      {data.gateways.mqtt > 0 && <div>MQTT: {data.gateways.mqtt}</div>}
                      {data.gateways.bacnet > 0 && <div>BACnet: {data.gateways.bacnet}</div>}
                      {data.gateways.enip > 0 && <div>EtherNet/IP: {data.gateways.enip}</div>}
                    </div>
                  </>
                }
              />
            </div>

            {/* Footer */}
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right pt-4 border-t border-gray-200 dark:border-gray-700">
              Last updated: {new Date(data.timestamp).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
