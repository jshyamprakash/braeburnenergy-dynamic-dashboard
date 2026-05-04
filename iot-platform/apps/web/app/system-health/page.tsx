'use client';

import { useAppSelector } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSystemHealth } from '@/lib/hooks/useSystemHealth';
import { Activity, AlertCircle } from 'lucide-react';

type StatusLevel = 'green' | 'amber' | 'red';

const statusConfig = {
  green: {
    card:   'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/60',
    dot:    'bg-emerald-500',
    ping:   'bg-emerald-400',
    badge:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    label:  'Healthy',
    pulse:  true,
  },
  amber: {
    card:   'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/60',
    dot:    'bg-amber-500',
    ping:   'bg-amber-400',
    badge:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    label:  'Degraded',
    pulse:  true,
  },
  red: {
    card:   'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800/60',
    dot:    'bg-rose-500',
    ping:   'bg-rose-400',
    badge:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    label:  'Down',
    pulse:  false,
  },
};

const overallConfig = {
  green: { bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60', text: 'text-emerald-700 dark:text-emerald-300', label: 'HEALTHY', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60', text: 'text-amber-700 dark:text-amber-300', label: 'DEGRADED', dot: 'bg-amber-500' },
  red:   { bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60', text: 'text-rose-700 dark:text-rose-300', label: 'DOWN', dot: 'bg-rose-500' },
};

function StatusDot({ status }: { status: StatusLevel }) {
  const cfg = statusConfig[status];
  return (
    <span className="relative flex h-3 w-3 flex-shrink-0">
      {cfg.pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.ping} opacity-60`} />
      )}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${cfg.dot}`} />
    </span>
  );
}

function StatusCard({ title, status, details }: { title: string; status: StatusLevel; details: React.ReactNode }) {
  const cfg = statusConfig[status];
  return (
    <div className={`rounded-xl border p-4 ${cfg.card}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <StatusDot status={status} />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>
      <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">{details}</div>
    </div>
  );
}

export default function SystemHealthPage() {
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const { data, isLoading, error } = useSystemHealth(30000);

  useEffect(() => {
    if (user && !['Admin', 'SuperAdmin'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || !['Admin', 'SuperAdmin'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-rose-500 dark:text-rose-400 text-sm">Access denied. Admin role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Health</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Live infrastructure status · updates every 30s</p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading system health…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Overall status banner */}
          {(() => {
            const cfg = overallConfig[data.overall as StatusLevel] ?? overallConfig.green;
            return (
              <div className={`rounded-xl border px-5 py-4 flex items-center justify-between ${cfg.bg}`}>
                <div className={`flex items-center gap-3 ${cfg.text}`}>
                  <span className="relative flex h-4 w-4">
                    {data.overall !== 'red' && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-50`} />
                    )}
                    <span className={`relative inline-flex rounded-full h-4 w-4 ${cfg.dot}`} />
                  </span>
                  <span className="text-2xl font-bold tracking-wide">{cfg.label}</span>
                </div>
                <p className={`text-xs ${cfg.text} opacity-70`}>
                  Updated {new Date(data.timestamp).toLocaleTimeString()}
                </p>
              </div>
            );
          })()}

          {/* Service cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatusCard
              title="NATS JetStream"
              status={data.nats.status}
              details={
                data.nats.error ? (
                  <p className="text-rose-500">{data.nats.error}</p>
                ) : (
                  <>
                    <div className="flex justify-between"><span>sensor_raw</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data.nats.streams?.[0]?.messages ?? '–'} msgs</span></div>
                    <div className="flex justify-between"><span>sensor_processed</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data.nats.streams?.[1]?.messages ?? '–'} msgs</span></div>
                  </>
                )
              }
            />
            <StatusCard
              title="Redis"
              status={data.redis.status}
              details={
                data.redis.error ? (
                  <p className="text-rose-500">{data.redis.error}</p>
                ) : (
                  <>
                    <div className="flex justify-between"><span>Latency</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data.redis.latencyMs ?? '–'}ms</span></div>
                    <div className="flex justify-between"><span>Memory</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data.redis.memoryUsed ?? '–'}</span></div>
                  </>
                )
              }
            />
            <StatusCard
              title="BullMQ Queue"
              status={data.bullmq.status}
              details={
                data.bullmq.error ? (
                  <p className="text-rose-500">{data.bullmq.error}</p>
                ) : (
                  <>
                    <div className="flex justify-between"><span>Waiting</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data.bullmq.waiting ?? 0}</span></div>
                    <div className="flex justify-between"><span>Active</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data.bullmq.active ?? 0}</span></div>
                    <div className="flex justify-between"><span>Failed</span><span className={`font-mono font-medium ${(data.bullmq.failed ?? 0) > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{data.bullmq.failed ?? 0}</span></div>
                  </>
                )
              }
            />
            <StatusCard
              title="MongoDB"
              status={data.mongodb.status}
              details={
                data.mongodb.error ? (
                  <p className="text-rose-500">{data.mongodb.error}</p>
                ) : (
                  <>
                    <div className="flex justify-between"><span>Role</span><span className="font-medium text-slate-700 dark:text-slate-300">{data.mongodb.isPrimary ? 'Primary' : 'Secondary'}</span></div>
                    <div className="flex justify-between"><span>ReplicaSet</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data.mongodb.replicaSet ?? '–'}</span></div>
                  </>
                )
              }
            />
            <StatusCard
              title="Gateways"
              status={data.gateways.status}
              details={
                <>
                  <div className="flex justify-between"><span>Connected</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data.gateways.total}</span></div>
                  {data.gateways.modbus > 0 && <div className="flex justify-between"><span>Modbus</span><span className="font-mono text-slate-600 dark:text-slate-300">{data.gateways.modbus}</span></div>}
                  {data.gateways.opcua > 0 && <div className="flex justify-between"><span>OPC-UA</span><span className="font-mono text-slate-600 dark:text-slate-300">{data.gateways.opcua}</span></div>}
                  {data.gateways.mqtt > 0 && <div className="flex justify-between"><span>MQTT</span><span className="font-mono text-slate-600 dark:text-slate-300">{data.gateways.mqtt}</span></div>}
                  {data.gateways.bacnet > 0 && <div className="flex justify-between"><span>BACnet</span><span className="font-mono text-slate-600 dark:text-slate-300">{data.gateways.bacnet}</span></div>}
                  {data.gateways.enip > 0 && <div className="flex justify-between"><span>EtherNet/IP</span><span className="font-mono text-slate-600 dark:text-slate-300">{data.gateways.enip}</span></div>}
                </>
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
