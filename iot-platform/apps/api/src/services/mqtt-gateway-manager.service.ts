import mqtt, { type MqttClient } from 'mqtt';
import type { Logger } from 'pino';
import { MqttGateway, type IMqttGateway } from '../models/mqtt-gateway.model';
import type { NatsClient } from '../lib/nats-client.js';
import { DEFAULT_ORG_ID } from '../lib/request-context';

const ORG_ID = DEFAULT_ORG_ID;

/**
 * MqttGatewayManager
 *
 * Manages MQTT broker connections, topic subscriptions, and payload mapping.
 * Follows the Modbus/OPC-UA gateway manager pattern:
 * - connect() → subscribe topics → parse payload → NATS sensor.raw publish
 * - Workflow dispatch handled by Processing Engine (ADR-043)
 */

interface GatewayInstance {
  gateway: IMqttGateway;
  client: MqttClient;
  isRunning: boolean;
}

class MqttGatewayManagerService {
  private instances: Map<string, GatewayInstance> = new Map();
  private natsClient?: NatsClient;

  /** Returns number of MQTT gateways currently connected (ADR-057) */
  getConnectedCount(): number {
    return Array.from(this.instances.values()).filter((i) => i.isRunning).length;
  }

  /** Register trigger dispatcher (deprecated: workflow dispatch moved to Processing Engine ADR-043) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setTriggerDispatcher(_dispatcher: any, _logger: Logger): void {
    // Workflow dispatch handled by Processing Engine
  }

  /** Inject NATS client (call from index.ts after creating natsClient) */
  setNatsClient(client: NatsClient): void {
    this.natsClient = client;
  }

  /** Start MQTT gateway — connect, subscribe all topic mappings */
  async startGateway(gatewayId: string): Promise<void> {
    const gateway = await MqttGateway.findById(gatewayId);
    if (!gateway) throw new Error(`MQTT Gateway not found: ${gatewayId}`);
    if (!gateway.isActive) throw new Error(`MQTT Gateway is not active: ${gatewayId}`);

    // Stop existing instance first
    if (this.instances.has(gatewayId)) {
      await this.stopGateway(gatewayId);
    }

    const connectOptions: mqtt.IClientOptions = {
      clientId: gateway.clientId || `iot-platform-${Date.now()}`,
      keepalive: gateway.keepalive,
      connectTimeout: gateway.connectTimeout,
      reconnectPeriod: gateway.reconnectPeriod,
    };

    if (gateway.auth?.username) {
      connectOptions.username = gateway.auth.username;
      connectOptions.password = gateway.auth.password;
    }

    if (gateway.tls?.enabled) {
      connectOptions.rejectUnauthorized = gateway.tls.rejectUnauthorized ?? true;
      if (gateway.tls.caCert) connectOptions.ca = gateway.tls.caCert;
      if (gateway.tls.clientCert) connectOptions.cert = gateway.tls.clientCert;
      if (gateway.tls.clientKey) connectOptions.key = gateway.tls.clientKey;
    }

    return new Promise((resolve, reject) => {
      const client = mqtt.connect(gateway.brokerUrl, connectOptions);

      const onConnect = async () => {
        client.off('error', onError);

        // Subscribe to all topic mappings
        for (const mapping of gateway.topicMappings) {
          client.subscribe(mapping.topic, { qos: mapping.qos }, (err) => {
            if (err) {
              console.error(`❌ MQTT subscribe error [${gateway.name}] topic=${mapping.topic}:`, err.message);
            } else {
              console.log(`📡 MQTT subscribed [${gateway.name}] topic=${mapping.topic} qos=${mapping.qos}`);
            }
          });
        }

        // Update gateway status
        gateway.status = 'connected';
        gateway.lastConnected = new Date();
        gateway.lastError = undefined;
        await gateway.save();

        const instance: GatewayInstance = { gateway, client, isRunning: true };
        this.instances.set(gatewayId, instance);

        // Wire up message handler
        client.on('message', (topic, payload) => {
          this.handleMessage(gatewayId, topic, payload).catch((err) => {
            console.error(`❌ MQTT message handler error [${gateway.name}]:`, err.message);
          });
        });

        client.on('error', (err) => {
          console.error(`❌ MQTT error [${gateway.name}]:`, err.message);
          MqttGateway.findByIdAndUpdate(gatewayId, {
            status: 'error',
            lastError: err.message,
          }).catch(() => {});
        });

        client.on('close', () => {
          console.log(`🔌 MQTT disconnected [${gateway.name}]`);
          const inst = this.instances.get(gatewayId);
          if (inst) {
            MqttGateway.findByIdAndUpdate(gatewayId, { status: 'disconnected' }).catch(() => {});
          }
        });

        console.log(`✅ MQTT Gateway started: ${gateway.name} (${gateway.brokerUrl})`);
        resolve();
      };

      const onError = (err: Error) => {
        client.end(true);
        MqttGateway.findByIdAndUpdate(gatewayId, {
          status: 'error',
          lastError: err.message,
        }).catch(() => {});
        reject(new Error(`MQTT connect failed [${gateway.name}]: ${err.message}`));
      };

      client.once('connect', onConnect);
      client.once('error', onError);
    });
  }

  /** Stop MQTT gateway — unsubscribe, disconnect, update status */
  async stopGateway(gatewayId: string): Promise<void> {
    const instance = this.instances.get(gatewayId);

    if (!instance) {
      // Not in memory — reset DB state
      const gateway = await MqttGateway.findById(gatewayId);
      if (!gateway) throw new Error(`MQTT Gateway not found: ${gatewayId}`);
      gateway.status = 'disconnected';
      await gateway.save();
      console.log(`⏹️  MQTT Gateway stopped (DB reset only): ${gateway.name}`);
      return;
    }

    await new Promise<void>((resolve) => {
      instance.client.end(false, {}, () => resolve());
    });

    instance.isRunning = false;
    instance.gateway.status = 'disconnected';
    await instance.gateway.save();

    this.instances.delete(gatewayId);
    console.log(`⏹️  MQTT Gateway stopped: ${instance.gateway.name}`);
  }

  /** Handle incoming MQTT message — match topic mapping, parse payload, publish to NATS */
  private async handleMessage(gatewayId: string, topic: string, payload: Buffer): Promise<void> {
    const instance = this.instances.get(gatewayId);
    if (!instance) return;

    const { gateway } = instance;
    const payloadStr = payload.toString('utf8');

    // Collect all matching mappings for this topic (may be multiple)
    const matchedMappings = gateway.topicMappings.filter((m) => this.topicMatches(m.topic, topic));
    if (matchedMappings.length === 0) return;

    // Group data by deviceId; capture first processingOverrides seen per device
    const statesByDevice: Record<string, Record<string, any>> = {};
    const overridesByDevice: Record<string, { noiseThreshold?: number; deltaPercent?: number } | undefined> = {};

    for (const mapping of matchedMappings) {
      let value: any;

      if (mapping.payloadFormat === 'raw') {
        // Try numeric, fallback to string
        const num = parseFloat(payloadStr);
        value = isNaN(num) ? payloadStr : num;
      } else {
        // JSON mode
        try {
          const parsed = JSON.parse(payloadStr);
          value = mapping.jsonPath ? this.getNestedValue(parsed, mapping.jsonPath) : parsed;
        } catch {
          // Non-JSON payload in json mode — treat as raw
          const num = parseFloat(payloadStr);
          value = isNaN(num) ? payloadStr : num;
        }
      }

      // Apply scale/offset to numeric values
      if (typeof value === 'number') {
        if (mapping.scale !== undefined) value = value * mapping.scale;
        if (mapping.offset !== undefined) value = value + mapping.offset;
      }

      if (!statesByDevice[mapping.deviceId]) {
        statesByDevice[mapping.deviceId] = {};
        // Store first override seen for this device (per-topic override wins over global)
        if (mapping.processingOverrides) {
          overridesByDevice[mapping.deviceId] = mapping.processingOverrides;
        }
      }
      statesByDevice[mapping.deviceId][mapping.field] = value;
      if (mapping.unit) {
        statesByDevice[mapping.deviceId][`${mapping.field}_unit`] = mapping.unit;
      }
    }

    const now = new Date();

    // Publish to NATS sensor.raw per device
    for (const [deviceId, data] of Object.entries(statesByDevice)) {
      const natsData = Object.fromEntries(
        Object.entries(data).filter(([k]) => !k.endsWith('_unit'))
      );

      if (this.natsClient) {
        this.natsClient
          .publish(`sensor.raw.${deviceId}`, {
            orgId: ORG_ID,
            deviceId,
            data: natsData,
            timestamp: now.toISOString(),
            source: 'mqtt',
            processingOverrides: overridesByDevice[deviceId],
          })
          .catch((err: any) => {
            console.warn(`NATS publish failed for MQTT gateway [${gateway.name}]:`, err);
          });
      }

      console.log(`📨 MQTT [${gateway.name}] topic=${topic} device=${deviceId} fields=${Object.keys(natsData).join(',')}`);
    }

    // Update message stats
    gateway.lastMessageAt = now;
    gateway.totalMessagesReceived = (gateway.totalMessagesReceived || 0) + 1;
    // Fire-and-forget save (don't await to avoid blocking message handler)
    MqttGateway.findByIdAndUpdate(gateway._id, {
      lastMessageAt: now,
      $inc: { totalMessagesReceived: 1 },
    }).catch(() => {});
  }

  /** Test broker connection without subscribing */
  async testConnection(gatewayId: string): Promise<{ success: boolean; message: string }> {
    const gateway = await MqttGateway.findById(gatewayId);
    if (!gateway) throw new Error(`MQTT Gateway not found: ${gatewayId}`);

    const options: mqtt.IClientOptions = {
      clientId: `iot-platform-test-${Date.now()}`,
      connectTimeout: Math.min(gateway.connectTimeout, 5000),
      reconnectPeriod: 0, // No auto-reconnect for test
    };

    if (gateway.auth?.username) {
      options.username = gateway.auth.username;
      options.password = gateway.auth.password;
    }

    if (gateway.tls?.enabled) {
      options.rejectUnauthorized = gateway.tls.rejectUnauthorized ?? true;
      if (gateway.tls.caCert) options.ca = gateway.tls.caCert;
    }

    return new Promise((resolve) => {
      const client = mqtt.connect(gateway.brokerUrl, options);
      const timeout = setTimeout(() => {
        client.end(true);
        resolve({ success: false, message: 'Connection timed out' });
      }, 6000);

      client.once('connect', () => {
        clearTimeout(timeout);
        client.end(true);
        resolve({ success: true, message: `Connected to ${gateway.brokerUrl}` });
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        client.end(true);
        resolve({ success: false, message: err.message });
      });
    });
  }

  /** Get runtime status for a gateway */
  getGatewayStatus(gatewayId: string): { running: boolean; connected: boolean } {
    const instance = this.instances.get(gatewayId);
    if (!instance) return { running: false, connected: false };
    return {
      running: instance.isRunning,
      connected: instance.client.connected,
    };
  }

  /** Restore active gateways on server startup */
  async restoreRunningGateways(): Promise<void> {
    const gateways = await MqttGateway.find({ status: 'connected', isActive: true }).lean();
    for (const gw of gateways) {
      this.startGateway(gw._id.toString()).catch((err) => {
        console.warn(`⚠️  Failed to restore MQTT gateway ${gw.name}:`, err.message);
      });
    }
  }

  /** MQTT topic wildcard matching (+ = single level, # = multi-level) */
  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) return false;
      if (i === patternParts.length - 1 && i < topicParts.length - 1) return false;
    }
    return patternParts.length === topicParts.length;
  }

  /** Resolve a dot-notation JSON path (e.g. "sensors.temperature") */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((cur, key) => (cur && cur[key] !== undefined ? cur[key] : undefined), obj);
  }
}

export const mqttGatewayManager = new MqttGatewayManagerService();
