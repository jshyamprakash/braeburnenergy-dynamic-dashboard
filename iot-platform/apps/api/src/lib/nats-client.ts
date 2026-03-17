import { connect, JetStreamClient, NatsConnection, StringCodec } from 'nats';
import type { IQualityMetadata } from '../models/device-state.model.js';

const sc = StringCodec();

export interface SensorRawEvent {
  orgId: string;
  deviceId: string;
  data: Record<string, unknown>;
  timestamp: string; // ISO string
  source: 'modbus' | 'opcua' | 'rest';
  quality?: IQualityMetadata;
}

export class NatsClient {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;

  async connect(url: string): Promise<void> {
    this.nc = await connect({ servers: url });
    this.js = this.nc.jetstream();
  }

  async publish(subject: string, payload: SensorRawEvent): Promise<void> {
    if (!this.js) return;
    await this.js.publish(subject, sc.encode(JSON.stringify(payload)));
  }

  async drain(): Promise<void> {
    await this.nc?.drain();
  }
}

export const natsClient = new NatsClient();
