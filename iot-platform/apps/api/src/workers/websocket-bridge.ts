/**
 * ADR-043 Phase 4 — NATS → WebSocket Bridge
 *
 * Consumes sensor.processed JetStream via a durable pull consumer.
 * For each filtered event, broadcasts device:state to Socket.io subscribers.
 *
 * REST events are NOT bridged here — device-state.controller.ts handles
 * its own Socket.io emission for REST (source='rest' events never reach
 * sensor.processed because the Processing Engine skips them).
 */
import { AckPolicy, DeliverPolicy, ReplayPolicy, StringCodec } from 'nats';
import { Server as SocketIOServer } from 'socket.io';
import { natsClient } from '../lib/nats-client.js';
import { broadcastDeviceState } from '../websocket/server.js';
import type { SensorProcessedEvent } from './processing-engine.js';

const sc = StringCodec();

const STREAM_NAME = 'sensor_processed';
const CONSUMER_NAME = 'websocket-bridge';

let io: SocketIOServer | null = null;
let consumerMessages: { stop(): void } | null = null;

export function setWebSocketBridgeIO(socketIO: SocketIOServer): void {
  io = socketIO;
}

export async function startWebSocketBridge(): Promise<void> {
  const nc = natsClient.getNatsConnection();
  const js = natsClient.getJetStream();
  const jsm = await nc.jetstreamManager();

  // Ensure durable consumer on sensor_processed for WebSocket fan-out
  try {
    await jsm.consumers.info(STREAM_NAME, CONSUMER_NAME);
    console.log(`📋 NATS consumer "${CONSUMER_NAME}" already exists`);
  } catch {
    await jsm.consumers.add(STREAM_NAME, {
      durable_name: CONSUMER_NAME,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.New,
      filter_subject: 'sensor.processed.>',
      replay_policy: ReplayPolicy.Instant,
    });
    console.log(`✅ NATS consumer "${CONSUMER_NAME}" created`);
  }

  const consumer = await js.consumers.get(STREAM_NAME, CONSUMER_NAME);
  const messages = await consumer.consume();
  consumerMessages = messages;

  (async () => {
    for await (const msg of messages) {
      try {
        const event: SensorProcessedEvent = JSON.parse(sc.decode(msg.data));
        if (io) {
          broadcastDeviceState(io, {
            deviceId: event.deviceId,
            data: event.data as Record<string, unknown>,
            derived: undefined,
            timestamp: new Date(event.timestamp),
          });
        }
        msg.ack();
      } catch (err) {
        console.error('WebSocketBridge: message processing error:', err);
        msg.nak();
      }
    }
  })().catch(console.error);

  console.log('✅ WebSocket Bridge started (sensor.processed → Socket.io device:state)');
}

export async function stopWebSocketBridge(): Promise<void> {
  if (consumerMessages) {
    consumerMessages.stop();
    consumerMessages = null;
  }
  io = null;
  console.log('✅ WebSocket Bridge stopped');
}
