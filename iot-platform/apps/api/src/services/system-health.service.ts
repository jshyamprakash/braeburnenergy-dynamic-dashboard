/**
 * SystemHealthService (ADR-057)
 *
 * Aggregates health data from all infrastructure subsystems.
 * Each check is isolated — a failure in one subsystem does not crash others.
 */
import mongoose from 'mongoose';
import { Queue } from 'bullmq';
import { natsClient } from '../lib/nats-client.js';
import { getRedisClient, getBullMQConnection } from '../lib/redis-client.js';
import { modbusGatewayManager } from './modbus-gateway-manager.service.js';
import { opcuaGatewayManager } from './opcua-gateway-manager.service.js';
import { mqttGatewayManager } from './mqtt-gateway-manager.service.js';
import { bacnetGatewayManager } from './bacnet-gateway-manager.service.js';
import { enipGatewayManager } from './enip-gateway-manager.service.js';

export type HealthStatus = 'green' | 'amber' | 'red';

export interface NatsHealth {
  status: HealthStatus;
  streams?: { name: string; messages: number; bytes: number }[];
  error?: string;
}

export interface RedisHealth {
  status: HealthStatus;
  latencyMs?: number;
  memoryUsed?: string;
  error?: string;
}

export interface BullMQHealth {
  status: HealthStatus;
  waiting?: number;
  active?: number;
  failed?: number;
  error?: string;
}

export interface MongoHealth {
  status: HealthStatus;
  isPrimary?: boolean;
  replicaSet?: string;
  primary?: string;
  error?: string;
}

export interface GatewayHealth {
  status: HealthStatus;
  modbus: number;
  opcua: number;
  mqtt: number;
  bacnet: number;
  enip: number;
  total: number;
}

export interface SystemHealthResult {
  nats: NatsHealth;
  redis: RedisHealth;
  bullmq: BullMQHealth;
  mongodb: MongoHealth;
  gateways: GatewayHealth;
  overall: HealthStatus;
  timestamp: string;
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('red')) return 'red';
  if (statuses.includes('amber')) return 'amber';
  return 'green';
}

async function checkNats(): Promise<NatsHealth> {
  try {
    const nc = natsClient.getNatsConnection();
    const jsm = await nc.jetstreamManager();
    const streamNames = ['sensor_raw', 'sensor_processed'];
    const streams: { name: string; messages: number; bytes: number }[] = [];

    for (const name of streamNames) {
      try {
        const info = await jsm.streams.info(name);
        streams.push({
          name,
          messages: info.state.messages,
          bytes: info.state.bytes,
        });
      } catch {
        // Stream may not exist yet (e.g. sensor_processed before first message)
        streams.push({ name, messages: -1, bytes: -1 });
      }
    }

    return { status: 'green', streams };
  } catch (e: any) {
    return { status: 'red', error: e.message };
  }
}

async function checkRedis(): Promise<RedisHealth> {
  try {
    const redis = getRedisClient();
    const start = Date.now();
    await redis.ping();
    const latencyMs = Date.now() - start;

    const infoStr = await redis.info('memory');
    const match = infoStr.match(/used_memory_human:(\S+)/);
    const memoryUsed = match?.[1] ?? 'unknown';

    const status: HealthStatus = latencyMs < 200 ? 'green' : 'amber';
    return { status, latencyMs, memoryUsed };
  } catch (e: any) {
    return { status: 'red', error: e.message };
  }
}

async function checkBullMQ(): Promise<BullMQHealth> {
  let queue: Queue | null = null;
  try {
    queue = new Queue('device-state-storage', { connection: getBullMQConnection() });
    const counts = await queue.getJobCounts('waiting', 'active', 'failed');
    const status: HealthStatus = (counts.failed ?? 0) > 0 ? 'amber' : 'green';
    return {
      status,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      failed: counts.failed ?? 0,
    };
  } catch (e: any) {
    return { status: 'red', error: e.message };
  } finally {
    await queue?.close().catch(() => {});
  }
}

async function checkMongoDB(): Promise<MongoHealth> {
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not initialised');
    const result = await db.command({ isMaster: 1 });
    return {
      status: result.ismaster ? 'green' : 'amber',
      isPrimary: result.ismaster,
      replicaSet: result.setName,
      primary: result.primary,
    };
  } catch (e: any) {
    return { status: 'red', error: e.message };
  }
}

function checkGateways(): GatewayHealth {
  const counts = {
    modbus: modbusGatewayManager.getConnectedCount(),
    opcua: opcuaGatewayManager.getConnectedCount(),
    mqtt: mqttGatewayManager.getConnectedCount(),
    bacnet: bacnetGatewayManager.getConnectedCount(),
    enip: enipGatewayManager.getConnectedCount(),
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { status: 'green', ...counts, total };
}

export async function getSystemHealth(): Promise<SystemHealthResult> {
  const [nats, redis, bullmq, mongodb] = await Promise.all([
    checkNats(),
    checkRedis(),
    checkBullMQ(),
    checkMongoDB(),
  ]);
  const gateways = checkGateways();

  const overall = worstStatus([nats.status, redis.status, bullmq.status, mongodb.status]);

  return {
    nats,
    redis,
    bullmq,
    mongodb,
    gateways,
    overall,
    timestamp: new Date().toISOString(),
  };
}
