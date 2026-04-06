import type { Logger } from 'pino';
import { EnipGateway, type IEnipGateway, type IEnipTag } from '../models/enip-gateway.model';
import { Device } from '../models/device.model';
import { deviceService } from './device.service';
import type { NatsClient } from '../lib/nats-client.js';

/**
 * EnipGatewayManager
 *
 * Manages Ethernet/IP (CIP) connections to Allen-Bradley / Rockwell PLCs.
 * Pattern: connect → read CIP tags by name → NATS sensor.raw publish
 * → Storage Worker → MongoDB (ADR-043, ADR-056).
 *
 * Uses node-ethernet-ip under the hood, imported dynamically.
 */

interface GatewayInstance {
  gateway: IEnipGateway;
  controller: any;          // node-ethernet-ip Controller
  pollingInterval: NodeJS.Timeout | null;
  retryCount: number;
}

const MAX_RETRY = 5;

class EnipGatewayManagerService {
  private instances: Map<string, GatewayInstance> = new Map();
  private natsClient?: NatsClient;

  /** Returns number of EtherNet/IP gateways currently running (ADR-057) */
  getConnectedCount(): number {
    return this.instances.size;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setTriggerDispatcher(_dispatcher: any, _logger: Logger): void {}

  setNatsClient(client: NatsClient): void {
    this.natsClient = client;
  }

  async startGateway(gatewayId: string): Promise<void> {
    const gateway = await EnipGateway.findById(gatewayId);
    if (!gateway) throw new Error(`EtherNet/IP Gateway not found: ${gatewayId}`);

    if (this.instances.has(gatewayId)) {
      await this.stopGateway(gatewayId);
    }

    let enip: any;
    try {
      enip = await import('node-ethernet-ip');
    } catch {
      throw new Error('node-ethernet-ip package not installed. Run: pnpm add node-ethernet-ip --filter api');
    }

    const { Controller } = enip;
    const controller = new Controller();

    // node-ethernet-ip uses connect(host, slot) returning a Promise
    try {
      await controller.connect(gateway.host, gateway.slot);
    } catch (err: any) {
      gateway.status = 'error';
      gateway.lastError = err.message;
      await gateway.save();
      throw new Error(`EtherNet/IP connect failed [${gateway.name}]: ${err.message}`);
    }

    gateway.status = 'connected';
    gateway.lastConnected = new Date();
    gateway.lastError = undefined;
    await gateway.save();

    const instance: GatewayInstance = { gateway, controller, pollingInterval: null, retryCount: 0 };
    this.instances.set(gatewayId, instance);

    if (gateway.polling.enabled) {
      this.startPolling(gatewayId);
    }

    console.log(`✅ EtherNet/IP Gateway started: ${gateway.name} (${gateway.host} slot=${gateway.slot})`);
  }

  async stopGateway(gatewayId: string): Promise<void> {
    const instance = this.instances.get(gatewayId);

    if (!instance) {
      const gateway = await EnipGateway.findById(gatewayId);
      if (!gateway) throw new Error(`EtherNet/IP Gateway not found: ${gatewayId}`);
      gateway.status = 'disconnected';
      gateway.polling.enabled = false;
      await gateway.save();
      console.log(`⏹️  EtherNet/IP Gateway stopped (DB reset): ${gateway.name}`);
      return;
    }

    if (instance.pollingInterval) {
      clearInterval(instance.pollingInterval);
      instance.pollingInterval = null;
    }

    try {
      instance.controller.destroy();
    } catch {
      // ignore
    }

    instance.gateway.status = 'disconnected';
    instance.gateway.polling.enabled = false;
    await instance.gateway.save();

    this.instances.delete(gatewayId);
    console.log(`⏹️  EtherNet/IP Gateway stopped: ${instance.gateway.name}`);
  }

  async readTag(gatewayId: string, fieldName: string): Promise<any> {
    const instance = this.instances.get(gatewayId);
    if (!instance) throw new Error(`Gateway not running: ${gatewayId}`);

    const tag = instance.gateway.tags.find((t) => t.field === fieldName);
    if (!tag) throw new Error(`Tag field not found: ${fieldName}`);

    return this.readSingleTag(instance.controller, tag);
  }

  async testConnection(gatewayId: string): Promise<{ success: boolean; message: string }> {
    const gateway = await EnipGateway.findById(gatewayId);
    if (!gateway) throw new Error(`EtherNet/IP Gateway not found: ${gatewayId}`);

    let enip: any;
    try {
      enip = await import('node-ethernet-ip');
    } catch {
      return { success: false, message: 'node-ethernet-ip package not installed' };
    }

    const { Controller } = enip;
    const controller = new Controller();

    try {
      await controller.connect(gateway.host, gateway.slot);
      controller.destroy();
      return { success: true, message: `Connected to ${gateway.host} slot=${gateway.slot}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  getGatewayStatus(gatewayId: string): { running: boolean; connected: boolean } {
    const instance = this.instances.get(gatewayId);
    if (!instance) return { running: false, connected: false };
    return { running: true, connected: instance.gateway.status === 'connected' };
  }

  async restoreRunningGateways(): Promise<void> {
    const gateways = await EnipGateway.find({ status: 'connected' }).lean();
    for (const gw of gateways) {
      this.startGateway(gw._id.toString()).catch((err) => {
        console.warn(`⚠️  Failed to restore EtherNet/IP gateway ${gw.name}:`, err.message);
      });
    }
  }

  // ==================== Private ====================

  private startPolling(gatewayId: string): void {
    const instance = this.instances.get(gatewayId);
    if (!instance) return;

    const { gateway } = instance;
    console.log(`🔄 EtherNet/IP polling started: ${gateway.name} (${gateway.polling.interval}ms)`);

    instance.pollingInterval = setInterval(async () => {
      try {
        await this.pollTags(instance);
        instance.retryCount = 0;
      } catch (err) {
        console.error(`❌ EtherNet/IP poll error [${gateway.name}]:`, (err as Error).message);

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

  private async pollTags(instance: GatewayInstance): Promise<void> {
    const { gateway, controller } = instance;
    const statesByDevice: Record<string, Record<string, any>> = {};
    const overridesByDevice: Record<string, any> = {};

    for (const tag of gateway.tags) {
      try {
        let value: any = await this.readSingleTag(controller, tag);

        if (typeof value === 'number') {
          if (tag.scale !== undefined) value = value * tag.scale;
          if (tag.offset !== undefined) value = value + tag.offset;
        }

        const deviceId = await this.getOrCreateDevice(gateway, tag);

        if (!statesByDevice[deviceId]) {
          statesByDevice[deviceId] = {};
          if (gateway.processingOverrides) overridesByDevice[deviceId] = gateway.processingOverrides;
        }

        statesByDevice[deviceId][tag.field] = value;
        if (tag.unit) statesByDevice[deviceId][`${tag.field}_unit`] = tag.unit;

        console.log(`📊 EtherNet/IP [${gateway.name}] ${tag.field}: ${value}${tag.unit || ''}`);
      } catch (err) {
        console.error(`❌ EtherNet/IP tag error [${gateway.name}] ${tag.tagName}:`, (err as Error).message);
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
            source: 'enip',
            ...(overridesByDevice[deviceId] && { processingOverrides: overridesByDevice[deviceId] }),
          })
          .catch((err: any) => {
            console.warn(`NATS publish failed for EtherNet/IP gateway [${gateway.name}]:`, err);
          });
      }
    }
  }

  /** Read a single CIP tag value from the controller */
  private async readSingleTag(controller: any, tag: IEnipTag): Promise<any> {
    // node-ethernet-ip: create a Tag and read it
    let enip: any;
    try {
      enip = await import('node-ethernet-ip');
    } catch {
      throw new Error('node-ethernet-ip not installed');
    }

    const { Tag } = enip;
    const cipTag = new Tag(tag.tagName);
    await controller.readTag(cipTag);
    return cipTag.value;
  }

  private async getOrCreateDevice(gateway: IEnipGateway, tag: IEnipTag): Promise<string> {
    if (tag.deviceId) return tag.deviceId;

    if (!gateway.deviceMapping.autoRegister) {
      throw new Error(`No deviceId on tag "${tag.field}" and autoRegister is disabled`);
    }

    const deviceName = `${gateway.deviceMapping.deviceIdPrefix || 'ENIP_'}${tag.field}`;
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
      tags: { protocol: 'enip', source: 'enip_gateway' },
      attributes: { value: 'number' },
    });

    console.log(`✅ EtherNet/IP auto-registered device: ${newDevice.name} (${newDevice.deviceId})`);
    return newDevice.deviceId;
  }
}

export const enipGatewayManager = new EnipGatewayManagerService();
