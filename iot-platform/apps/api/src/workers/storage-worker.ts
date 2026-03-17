/**
 * ADR-043 Storage Worker
 *
 * Consumes sensor.raw NATS stream via a durable pull consumer.
 * Accumulates events into batches and flushes via BullMQ.
 * BullMQ Worker performs batched insertMany into MongoDB device_states.
 *
 * Flow: NATS sensor.raw.> → batch accumulator → BullMQ queue → insertMany(ordered:false)
 *
 * REST events are filtered out (REST controller writes directly to DB, keeping 201 response contract).
 */
import { Queue, Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { AckPolicy, DeliverPolicy, ReplayPolicy, StringCodec } from 'nats';
import { getBullMQConnection, quitRedis } from '../lib/redis-client.js';
import { natsClient } from '../lib/nats-client.js';
import { DeviceState } from '../models/device-state.model.js';
import { config } from '../config/config.js';
import type { SensorRawEvent } from '../lib/nats-client.js';

const sc = StringCodec();

const QUEUE_NAME = 'device-state-storage';
const STREAM_NAME = 'sensor_raw';
const CONSUMER_NAME = 'storage-worker';

let storageQueue: Queue | null = null;
let storageWorkerInstance: Worker | null = null;
let consumerMessages: { stop(): void } | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let messageBatch: SensorRawEvent[] = [];

function getQueue(): Queue {
  if (!storageQueue) {
    storageQueue = new Queue(QUEUE_NAME, { connection: getBullMQConnection() });
  }
  return storageQueue;
}

async function flushBatch(): Promise<void> {
  if (messageBatch.length === 0) return;
  const toFlush = messageBatch.splice(0);
  await getQueue().add('batch', toFlush, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

function scheduleFlush(): void {
  flushTimer = setTimeout(async () => {
    try {
      await flushBatch();
    } catch (err) {
      console.error('StorageWorker: periodic flush error:', err);
    }
    scheduleFlush();
  }, config.worker.flushIntervalMs);
}

export async function startStorageWorker(): Promise<void> {
  const nc = natsClient.getNatsConnection();
  const js = natsClient.getJetStream();

  // Ensure durable consumer exists on sensor_raw stream
  const jsm = await nc.jetstreamManager();
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
    });
    console.log(`✅ NATS consumer "${CONSUMER_NAME}" created`);
  }

  // Get consumer and start pulling messages
  const consumer = await js.consumers.get(STREAM_NAME, CONSUMER_NAME);
  const messages = await consumer.consume();
  consumerMessages = messages;

  // Process messages in background
  (async () => {
    for await (const msg of messages) {
      try {
        const event: SensorRawEvent = JSON.parse(sc.decode(msg.data));
        messageBatch.push(event);

        if (messageBatch.length >= config.worker.batchSize) {
          await flushBatch();
        }

        msg.ack();
      } catch (err) {
        console.error('StorageWorker: message processing error:', err);
        msg.nak();
      }
    }
  })().catch(console.error);

  // Create BullMQ worker for batch MongoDB insertMany
  storageWorkerInstance = new Worker(
    QUEUE_NAME,
    async (job: Job<SensorRawEvent[]>) => {
      const events = job.data;

      // Skip REST events — REST controller already wrote to DB (preserves 201 response contract)
      const filtered = events.filter((e) => e.source !== 'rest');
      if (filtered.length === 0) return;

      const docs = filtered.map((event) => ({
        timestamp: new Date(event.timestamp),
        metadata: {
          deviceId: event.deviceId,
          orgId: new mongoose.Types.ObjectId(event.orgId),
        },
        data: event.data,
        quality: event.quality,
      }));

      await DeviceState.insertMany(docs, { ordered: false });
      console.log(`StorageWorker: inserted ${docs.length} device state(s)`);
    },
    { connection: getBullMQConnection() }
  );

  storageWorkerInstance.on('failed', (job, err) => {
    console.error('StorageWorker: job failed', {
      jobId: job?.id,
      eventCount: Array.isArray(job?.data) ? job.data.length : 0,
      reason: err.message,
    });
  });

  // Start periodic flush timer
  scheduleFlush();

  console.log(
    `✅ Storage Worker started (batchSize=${config.worker.batchSize}, flushInterval=${config.worker.flushIntervalMs}ms)`
  );
}

export async function stopStorageWorker(): Promise<void> {
  // Stop flush timer and flush remaining events
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushBatch().catch(console.error);

  // Stop NATS consumer message iteration
  if (consumerMessages) {
    consumerMessages.stop();
    consumerMessages = null;
  }

  // Close BullMQ worker
  if (storageWorkerInstance) {
    await storageWorkerInstance.close();
    storageWorkerInstance = null;
  }

  // Close BullMQ queue
  if (storageQueue) {
    await storageQueue.close();
    storageQueue = null;
  }

  // Close Redis connection
  await quitRedis();

  console.log('✅ Storage Worker stopped');
}
