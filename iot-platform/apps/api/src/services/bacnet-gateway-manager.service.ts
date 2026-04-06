import type { Logger } from 'pino';
import { BacnetGateway, type IBacnetGateway, type IBacnetObject } from '../models/bacnet-gateway.model';
import { Device } from '../models/device.model';
import { deviceService } from './device.service';
import type { NatsClient } from '../lib/nats-client.js';

/**
 * BacnetGatewayManager
 *
 * Manages BACnet/IP connections and object polling.
 * Pattern: connect → poll presentValue on all objects → NATS sensor.raw publish
 * → Storage Worker → MongoDB (same as Modbus/OPC-UA/MQTT — ADR-043).
 *
 * Uses node-bacnet under the hood. The library is imported dynamically so the
 * rest of the server still boots even if the package is not yet installed.
 */

interface GatewayInstance {
  gateway: IBacnetGateway;
  client: any;              // node-bacnet BAC0 / bacstack client
  pollingInterval: NodeJS.Timeout | null;
  retryCount: number;
}

const MAX_RETRY = 5;

class BacnetGatewayManagerService {
  private instances: Map<string, GatewayInstance> = new Map();
  private natsClient?: NatsClient;

  /** Returns number of BACnet gateways currently running (ADR-057) */
  getConnectedCount(): number {
    return this.instances.size;
  }

  /** Register trigger dispatcher (no-op: workflow dispatch handled by Processing Engine) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setTriggerDispatcher(_dispatcher: any, _logger: Logger): void {}

  /** Inject NATS client after NATS connects in index.ts */
  setNatsClient(client: NatsClient): void {
    this.natsClient = client;
  }

  /** Start BACnet gateway — open socket, mark connected, begin polling */
  async startGateway(gatewayId: string): Promise<void> {
    const gateway = await BacnetGateway.findById(gatewayId);
    if (!gateway) throw new Error(`BACnet Gateway not found: ${gatewayId}`);

    if (this.instances.has(gatewayId)) {
      await this.stopGateway(gatewayId);
    }

    let bacnet: any;
    try {
      // Dynamic import — avoids hard crash if node-bacnet is not installed
      bacnet = await import('node-bacnet');
    } catch {
      throw new Error('node-bacnet package not installed. Run: pnpm add node-bacnet --filter api');
    }

    // Create bacnet client bound to the remote device transport
    const client = new bacnet.default({
      adpuTimeout: gateway.timeout ?? 6000,
      port: gateway.port,
    });

    // node-bacnet emits 'error' events — catch them so the process doesn't crash
    client.on('error', (err: Error) => {
      console.error(`❌ BACnet error [${gateway.name}]:`, err.message);
      BacnetGateway.findByIdAndUpdate(gatewayId, {
        status: 'error',
        lastError: err.message,
      }).catch(() => {});
    });

    gateway.status = 'connected';
    gateway.lastConnected = new Date();
    gateway.lastError = undefined;
    await gateway.save();

    const instance: GatewayInstance = { gateway, client, pollingInterval: null, retryCount: 0 };
    this.instances.set(gatewayId, instance);

    if (gateway.polling.enabled) {
      this.startPolling(gatewayId);
    }

    console.log(`✅ BACnet Gateway started: ${gateway.name} (${gateway.host}:${gateway.port})`);
  }

  /** Stop BACnet gateway — clear polling, close client, update DB */
  async stopGateway(gatewayId: string): Promise<void> {
    const instance = this.instances.get(gatewayId);

    if (!instance) {
      const gateway = await BacnetGateway.findById(gatewayId);
      if (!gateway) throw new Error(`BACnet Gateway not found: ${gatewayId}`);
      gateway.status = 'disconnected';
      gateway.polling.enabled = false;
      await gateway.save();
      console.log(`⏹️  BACnet Gateway stopped (DB reset): ${gateway.name}`);
      return;
    }

    if (instance.pollingInterval) {
      clearInterval(instance.pollingInterval);
      instance.pollingInterval = null;
    }

    try {
      instance.client.close();
    } catch {
      // ignore close errors
    }

    instance.gateway.status = 'disconnected';
    instance.gateway.polling.enabled = false;
    await instance.gateway.save();

    this.instances.delete(gatewayId);
    console.log(`⏹️  BACnet Gateway stopped: ${instance.gateway.name}`);
  }

  /** Read a single BACnet object by field name (for manual test reads) */
  async readObject(gatewayId: string, fieldName: string): Promise<number | boolean | string | null> {
    const instance = this.instances.get(gatewayId);
    if (!instance) throw new Error(`Gateway not running: ${gatewayId}`);

    const obj = instance.gateway.objects.find((o) => o.field === fieldName);
    if (!obj) throw new Error(`Object field not found: ${fieldName}`);

    return this.readSingleObject(instance.client, instance.gateway.host, obj);
  }

  /** Test: open client, read first object, close */
  async testConnection(gatewayId: string): Promise<{ success: boolean; message: string }> {
    const gateway = await BacnetGateway.findById(gatewayId);
    if (!gateway) throw new Error(`BACnet Gateway not found: ${gatewayId}`);

    let bacnet: any;
    try {
      bacnet = await import('node-bacnet');
    } catch {
      return { success: false, message: 'node-bacnet package not installed' };
    }

    const client = new bacnet.default({ adpuTimeout: 5000, port: gateway.port });

    try {
      if (gateway.objects.length > 0) {
        await this.readSingleObject(client, gateway.host, gateway.objects[0]);
      }
      client.close();
      return { success: true, message: `Reachable at ${gateway.host}:${gateway.port}` };
    } catch (err: any) {
      client.close();
      return { success: false, message: err.message };
    }
  }

  getGatewayStatus(gatewayId: string): { running: boolean; connected: boolean } {
    const instance = this.instances.get(gatewayId);
    if (!instance) return { running: false, connected: false };
    return { running: true, connected: instance.gateway.status === 'connected' };
  }

  /** Re-start gateways that were connected at last server shutdown */
  async restoreRunningGateways(): Promise<void> {
    const gateways = await BacnetGateway.find({ status: 'connected' }).lean();
    for (const gw of gateways) {
      this.startGateway(gw._id.toString()).catch((err) => {
        console.warn(`⚠️  Failed to restore BACnet gateway ${gw.name}:`, err.message);
      });
    }
  }

  // ==================== Private ====================

  private startPolling(gatewayId: string): void {
    const instance = this.instances.get(gatewayId);
    if (!instance) return;

    const { gateway } = instance;
    console.log(`🔄 BACnet polling started: ${gateway.name} (${gateway.polling.interval}ms)`);

    instance.pollingInterval = setInterval(async () => {
      try {
        await this.pollObjects(instance);
        instance.retryCount = 0;
      } catch (err) {
        console.error(`❌ BACnet poll error [${gateway.name}]:`, (err as Error).message);

        if (gateway.polling.onError === 'stop') {
          await this.stopGateway(gatewayId);
        } else {
          instance.retryCount++;
          if (instance.retryCount >= MAX_RETRY) {
            gateway.status = 'error';
            gateway.lastError = `Max retries: ${(err as Error).message}`;
            await gateway.save();
          }
        }
      }
    }, gateway.polling.interval);
  }

  private async pollObjects(instance: GatewayInstance): Promise<void> {
    const { gateway, client } = instance;
    const statesByDevice: Record<string, Record<string, any>> = {};
    const overridesByDevice: Record<string, any> = {};

    for (const obj of gateway.objects) {
      try {
        let value: number | boolean | string | null = await this.readSingleObject(client, gateway.host, obj);

        if (typeof value === 'number') {
          if (obj.scale !== undefined) value = value * obj.scale;
          if (obj.offset !== undefined) value = value + obj.offset;
        }

        const deviceId = await this.getOrCreateDevice(gateway, obj);

        if (!statesByDevice[deviceId]) {
          statesByDevice[deviceId] = {};
          if (gateway.processingOverrides) overridesByDevice[deviceId] = gateway.processingOverrides;
        }

        statesByDevice[deviceId][obj.field] = value;
        if (obj.unit) statesByDevice[deviceId][`${obj.field}_unit`] = obj.unit;

        console.log(`📊 BACnet [${gateway.name}] ${obj.field}: ${value}${obj.unit || ''}`);
      } catch (err) {
        console.error(`❌ BACnet read error [${gateway.name}] ${obj.field}:`, (err as Error).message);
      }
    }

    const now = new Date();

    for (const [deviceId, data] of Object.entries(statesByDevice)) {
      const natsData = Object.fromEntries(
        Object.entries(data).filter(([k]) => !k.endsWith('_unit'))
      );

      if (this.natsClient) {
        this.natsClient
          .publish(`sensor.raw.${deviceId}`, {
            orgId: gateway.orgId.toString(),
            deviceId,
            data: natsData,
            timestamp: now.toISOString(),
            source: 'bacnet',
            ...(overridesByDevice[deviceId] && { processingOverrides: overridesByDevice[deviceId] }),
          })
          .catch((err: any) => {
            console.warn(`NATS publish failed for BACnet gateway [${gateway.name}]:`, err);
          });
      }
    }
  }

  /** Read a single BACnet property from a remote device — promisified */
  private readSingleObject(
    client: any,
    host: string,
    obj: IBacnetObject
  ): Promise<number | boolean | string | null> {
    return new Promise((resolve, reject) => {
      // node-bacnet objectType enum mapping
      const typeMap: Record<string, number> = {
        analogInput: 0, analogOutput: 1, analogValue: 2,
        binaryInput: 3, binaryOutput: 4, binaryValue: 5,
        multiStateInput: 13, multiStateOutput: 14, multiStateValue: 19,
      };
      const propMap: Record<string, number> = {
        presentValue: 85, statusFlags: 111, description: 28, units: 117,
      };

      const objectId = { type: typeMap[obj.objectType] ?? 0, instance: obj.instanceNumber };
      const propertyId = propMap[obj.property] ?? 85;

      client.readProperty(host, objectId, propertyId, null, (err: any, value: any) => {
        if (err) return reject(new Error(`readProperty failed: ${err.message || err}`));
        // node-bacnet wraps in { value: [ { value: X } ] }
        const raw = value?.values?.[0]?.value ?? value?.value ?? value;
        resolve(raw ?? null);
      });
    });
  }

  private async getOrCreateDevice(gateway: IBacnetGateway, obj: IBacnetObject): Promise<string> {
    if (obj.deviceId) return obj.deviceId;

    if (!gateway.deviceMapping.autoRegister) {
      throw new Error(`No deviceId on object "${obj.field}" and autoRegister is disabled`);
    }

    const deviceName = `${gateway.deviceMapping.deviceIdPrefix || 'BACNET_'}${obj.field}`;
    const orgId = gateway.orgId.toString();

    const existing = await Device.findOne({
      orgId: gateway.orgId,
      name: deviceName,
    }).lean();
    if (existing) return existing.deviceId;

    if (!gateway.applicationId) {
      throw new Error(`Gateway "${gateway.name}" has no applicationId — required for auto-device-registration`);
    }

    const newDevice = await deviceService.create(orgId, {
      name: deviceName,
      applicationId: gateway.applicationId,
      dataSource: 'gateway',
      tags: { protocol: 'bacnet', source: 'bacnet_gateway' },
      attributes: { value: 'number' },
    });

    console.log(`✅ BACnet auto-registered device: ${newDevice.name} (${newDevice.deviceId})`);
    return newDevice.deviceId;
  }
}

export const bacnetGatewayManager = new BacnetGatewayManagerService();
