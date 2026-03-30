/**
 * ADR-043 Phase 3 — Processing Engine
 *
 * Consumes sensor.raw NATS stream via a separate durable pull consumer.
 * Applies per-device EMA noise filter + delta detection, then:
 *   - Writes latest snapshot to Redis: sensor:latest:{deviceId}
 *   - Publishes filtered events to sensor.processed.{deviceId}
 *   - Dispatches WorkflowTriggerDispatcher (moved here from gateway managers)
 *
 * REST events are skipped — REST controller handles its own dispatch.
 * Workflow dispatch is moved here from Modbus + OPC-UA gateway managers (ADR-043 Phase 3).
 */
import { AckPolicy, DeliverPolicy, ReplayPolicy, StringCodec } from 'nats';
import mongoose from 'mongoose';
import { natsClient } from '../lib/nats-client.js';
import { getRedisClient } from '../lib/redis-client.js';
import { config } from '../config/config.js';
import type { SensorRawEvent } from '../lib/nats-client.js';
import type { WorkflowTriggerDispatcher } from '../services/workflow-trigger-dispatcher.service.js';
import type { Logger } from 'pino';

const sc = StringCodec();

const STREAM_NAME = 'sensor_raw';
const PROCESSED_STREAM_NAME = 'sensor_processed';
const CONSUMER_NAME = 'processing-engine';

export interface SensorProcessedEvent extends SensorRawEvent {
  filtered: boolean;
  delta: number;
}

interface SensorDeviceState {
  ema: number;
  lastEmitted: number;
}

const deviceStateMap = new Map<string, SensorDeviceState>();
const EMA_ALPHA = 0.1;

let triggerDispatcher: WorkflowTriggerDispatcher | null = null;
let dispatchLogger: Logger | null = null;
let consumerMessages: { stop(): void } | null = null;

export function setProcessingEngineDispatcher(
  dispatcher: WorkflowTriggerDispatcher,
  logger: Logger
): void {
  triggerDispatcher = dispatcher;
  dispatchLogger = logger;
}

function applyFilters(
  deviceId: string,
  data: Record<string, unknown>,
  overrides?: { deltaPercent?: number; noiseThreshold?: number }
): { filtered: boolean; delta: number } {
  const numericEntries: [string, number][] = Object.entries(data)
    .filter(([, v]) => typeof v === 'number' && isFinite(v as number))
    .map(([k, v]) => [k, v as number]);

  if (numericEntries.length === 0) return { filtered: false, delta: 0 };

  let anyPassed = false;
  let maxDelta = 0;

  for (const [fieldName, value] of numericEntries) {
    const key = `${deviceId}:${fieldName}`;
    const existing = deviceStateMap.get(key);

    if (!existing) {
      deviceStateMap.set(key, { ema: value, lastEmitted: value });
      anyPassed = true;
      continue;
    }

    const newEma = EMA_ALPHA * value + (1 - EMA_ALPHA) * existing.ema;
    const noiseThreshold = overrides?.noiseThreshold ?? config.processing.noiseThreshold;
    const deltaPercent   = overrides?.deltaPercent   ?? config.processing.deltaPercent;

    // Noise check
    if (Math.abs(value - newEma) < noiseThreshold) {
      existing.ema = newEma;
      continue;
    }

    // Delta check
    const absLast = Math.abs(existing.lastEmitted);
    if (absLast > 0 && Math.abs(value - existing.lastEmitted) / absLast < deltaPercent) {
      existing.ema = newEma;
      continue;
    }

    // Field passes — update state
    const fieldDelta = Math.abs(value - existing.lastEmitted);
    if (fieldDelta > maxDelta) maxDelta = fieldDelta;
    existing.ema = newEma;
    existing.lastEmitted = value;
    anyPassed = true;
  }

  return { filtered: !anyPassed, delta: maxDelta };
}

async function processEvent(event: SensorRawEvent): Promise<void> {
  if (event.source === 'rest') return;

  const { filtered, delta } = applyFilters(event.deviceId, event.data as Record<string, unknown>, event.processingOverrides);

  // Always update Redis cache (latest snapshot for dashboard)
  try {
    const redis = getRedisClient();
    const cacheKey = `${config.processing.cacheKeyPrefix}${event.deviceId}`;
    await redis.setex(cacheKey, config.processing.cacheTTLSeconds, JSON.stringify(event));
  } catch (err) {
    console.error('ProcessingEngine: Redis cache write failed:', err);
  }

  if (filtered) return;

  // Publish to sensor.processed
  try {
    const processedEvent: SensorProcessedEvent = { ...event, filtered: false, delta };
    const js = natsClient.getJetStream();
    await js.publish(
      `sensor.processed.${event.deviceId}`,
      sc.encode(JSON.stringify(processedEvent))
    );
  } catch (err) {
    console.error('ProcessingEngine: NATS publish to sensor.processed failed:', err);
  }

  // Dispatch workflow triggers
  if (triggerDispatcher && dispatchLogger) {
    const syntheticState = {
      _id: new mongoose.Types.ObjectId(),
      deviceId: event.deviceId,
      orgId: event.orgId,
      data: event.data,
      timestamp: new Date(event.timestamp),
    };
    triggerDispatcher
      .dispatchDeviceStateBatch(
        event.orgId,
        event.deviceId,
        event.data as Record<string, any>,
        syntheticState as any
      )
      .catch((err: any) => {
        dispatchLogger!.error(err, 'ProcessingEngine: workflow dispatch failed');
      });
  }
}

export async function startProcessingEngine(): Promise<void> {
  const nc = natsClient.getNatsConnection();
  const js = natsClient.getJetStream();
  const jsm = await nc.jetstreamManager();

  // Ensure sensor_processed stream exists
  try {
    await jsm.streams.info(PROCESSED_STREAM_NAME);
    console.log(`📋 NATS stream "${PROCESSED_STREAM_NAME}" already exists`);
  } catch {
    await jsm.streams.add({
      name: PROCESSED_STREAM_NAME,
      subjects: ['sensor.processed.>'],
      storage: 'memory' as any,
      retention: 'limits' as any,
      max_age: 60 * 1_000_000_000, // 60s in nanoseconds
    });
    console.log(`✅ NATS stream "${PROCESSED_STREAM_NAME}" created`);
  }

  // Ensure durable consumer on sensor_raw for processing engine
  try {
    await jsm.consumers.info(STREAM_NAME, CONSUMER_NAME);
    console.log(`📋 NATS consumer "${CONSUMER_NAME}" already exists`);
  } catch {
    await jsm.consumers.add(STREAM_NAME, {
      durable_name: CONSUMER_NAME,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.New,
      filter_subject: 'sensor.raw.>',
      replay_policy: ReplayPolicy.Instant,
      max_ack_pending: 20,
    });
    console.log(`✅ NATS consumer "${CONSUMER_NAME}" created`);
  }

  const consumer = await js.consumers.get(STREAM_NAME, CONSUMER_NAME);
  const messages = await consumer.consume();
  consumerMessages = messages;

  (async () => {
    const CONCURRENCY = 10;
    const pending = new Set<Promise<void>>();

    for await (const msg of messages) {
      if (pending.size >= CONCURRENCY) await Promise.race(pending);

      // eslint-disable-next-line prefer-const
      let p: Promise<void> = (async () => {
        try {
          const event: SensorRawEvent = JSON.parse(sc.decode(msg.data));
          await processEvent(event);
          msg.ack();
        } catch (err) {
          console.error('ProcessingEngine: message processing error:', err);
          msg.nak();
        } finally {
          // p is always assigned before the async body runs
          pending.delete(p!);
        }
      })();
      pending.add(p);
    }

    await Promise.allSettled(pending);
  })().catch(console.error);

  console.log(
    `✅ Processing Engine started (noiseThreshold=${config.processing.noiseThreshold}, deltaPercent=${config.processing.deltaPercent * 100}%, cacheTTL=${config.processing.cacheTTLSeconds}s)`
  );
}

export async function stopProcessingEngine(): Promise<void> {
  if (consumerMessages) {
    consumerMessages.stop();
    consumerMessages = null;
  }
  deviceStateMap.clear();
  triggerDispatcher = null;
  dispatchLogger = null;
  console.log('✅ Processing Engine stopped');
}
