import mongoose from 'mongoose';
import type { Logger } from 'pino';
import { ModbusGateway, IModbusGateway } from '../models/modbus-gateway.model';
import { ModbusClientService } from './modbus-client.service';
import { deviceService } from './device.service';
import type { WorkflowTriggerDispatcher } from './workflow-trigger-dispatcher.service';
import { Device } from '../models/device.model';
import type { NatsClient } from '../lib/nats-client.js';

/**
 * ModbusGatewayManager Service
 *
 * Manages Modbus gateway connections, polling, and data mapping.
 * Handles automatic device registration and state updates.
 * Dispatches to workflow triggers when device states are created.
 */

interface GatewayConnection {
  gateway: IModbusGateway;
  client: ModbusClientService;
  pollingInterval: NodeJS.Timeout | null;
  retryCount: number;
}

class ModbusGatewayManagerService {
  private connections: Map<string, GatewayConnection> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private triggerDispatcher?: WorkflowTriggerDispatcher;
  private logger?: Logger;
  private natsClient?: NatsClient;

  /**
   * Register trigger dispatcher (call from index.ts after creating dispatcher)
   */
  setTriggerDispatcher(dispatcher: WorkflowTriggerDispatcher, logger: Logger): void {
    this.triggerDispatcher = dispatcher;
    this.logger = logger;
  }

  /**
   * Inject NATS client (call from index.ts after creating natsClient)
   */
  setNatsClient(client: NatsClient): void {
    this.natsClient = client;
  }

  /**
   * Start gateway connection and polling
   */
  async startGateway(gatewayId: string): Promise<void> {
    const gateway = await ModbusGateway.findById(gatewayId);
    if (!gateway) {
      throw new Error(`Gateway not found: ${gatewayId}`);
    }

    // Check if already running
    if (this.connections.has(gatewayId)) {
      throw new Error(`Gateway already running: ${gatewayId}`);
    }

    const client = new ModbusClientService();
    const connection: GatewayConnection = {
      gateway,
      client,
      pollingInterval: null,
      retryCount: 0,
    };

    try {
      // Connect to Modbus device
      await client.connect(gateway.connection);

      // Update gateway status and enable polling
      gateway.status = 'connected';
      gateway.lastConnected = new Date();
      gateway.lastError = undefined;
      gateway.polling.enabled = true;
      await gateway.save();

      // Store connection
      this.connections.set(gatewayId, connection);

      // Always start polling when startGateway is called
      this.startPolling(gatewayId);

      console.log(`✅ Modbus gateway started: ${gateway.name} (${gateway.getConnectionString()})`);
    } catch (error) {
      gateway.status = 'error';
      gateway.lastError = (error as Error).message;
      await gateway.save();
      throw error;
    }
  }

  /**
   * Stop gateway connection and polling.
   * If the gateway is not in memory (e.g. after a server restart), we still
   * reset the DB state so the UI can transition back to the "stopped" state.
   */
  async stopGateway(gatewayId: string): Promise<void> {
    const connection = this.connections.get(gatewayId);

    if (!connection) {
      // Not running in memory — reset DB state and return gracefully
      const gateway = await ModbusGateway.findById(gatewayId);
      if (!gateway) {
        throw new Error(`Gateway not found: ${gatewayId}`);
      }
      gateway.status = 'disconnected';
      gateway.polling.enabled = false;
      await gateway.save();
      console.log(`⏹️  Modbus gateway stopped (DB reset only, was not running): ${gateway.name}`);
      return;
    }

    // Stop polling
    if (connection.pollingInterval) {
      clearInterval(connection.pollingInterval);
      connection.pollingInterval = null;
    }

    // Disconnect client
    await connection.client.disconnect();

    // Update gateway status
    connection.gateway.status = 'disconnected';
    connection.gateway.polling.enabled = false;
    await connection.gateway.save();

    // Remove connection
    this.connections.delete(gatewayId);

    console.log(`⏹️  Modbus gateway stopped: ${connection.gateway.name}`);
  }

  /**
   * Start polling for a gateway
   */
  private startPolling(gatewayId: string): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    const { gateway } = connection;

    console.log(`🔄 Starting polling for gateway: ${gateway.name} (interval: ${gateway.polling.interval}ms)`);

    connection.pollingInterval = setInterval(async () => {
      try {
        await this.pollRegisters(connection);
        connection.retryCount = 0; // Reset retry count on success
      } catch (error) {
        console.error(`❌ Polling error for gateway ${gateway.name}:`, (error as Error).message);

        if (gateway.polling.onError === 'stop') {
          console.log(`⏹️  Stopping gateway due to error: ${gateway.name}`);
          await this.stopGateway(gatewayId);
        } else {
          // Continue polling, but track retry count
          connection.retryCount++;
          if (connection.retryCount >= this.MAX_RETRY_ATTEMPTS) {
            console.error(`❌ Max retry attempts reached for gateway: ${gateway.name}`);
            gateway.status = 'error';
            gateway.lastError = `Max retry attempts reached: ${(error as Error).message}`;
            await gateway.save();
          }
        }
      }
    }, gateway.polling.interval);
  }

  /**
   * Poll all registers for a gateway
   * Batches registers by device: groups all registers mapped to the same device,
   * reads them all, then creates ONE device state document with all fields.
   */
  private async pollRegisters(connection: GatewayConnection): Promise<void> {
    const { gateway, client } = connection;

    // Phase 1: Read all registers and collect by deviceId
    const statesByDevice: Record<string, { data: Record<string, any>; registers: any[] }> = {};

    for (const register of gateway.registers) {
      try {
        // Read register value
        const value = await client.readRegister(register);

        // Get or create device
        const deviceId = await this.getOrCreateDevice(gateway, register);

        // Initialize device state if not seen before
        if (!statesByDevice[deviceId]) {
          statesByDevice[deviceId] = { data: {}, registers: [] };
        }

        // Add field and unit to device state
        statesByDevice[deviceId].data[register.name] = value;
        if (register.unit) {
          statesByDevice[deviceId].data[`${register.name}_unit`] = register.unit;
        }
        statesByDevice[deviceId].registers.push(register);

        console.log(`📊 ${gateway.name} > ${register.name}: ${value}${register.unit || ''}`);
      } catch (error) {
        console.error(`❌ Failed to read register ${register.name}:`, (error as Error).message);
        // Continue with next register
      }
    }

    // Phase 2: Publish to NATS and dispatch workflow triggers per unique device
    // Direct DB write removed (ADR-043): Storage Worker consumes sensor.raw and batch-inserts via insertMany
    for (const [deviceId, { data }] of Object.entries(statesByDevice)) {
      try {
        const triggerData = Object.fromEntries(
          Object.entries(data).filter(([k]) => !k.endsWith('_unit'))
        );
        const now = new Date();

        // Publish to NATS (Storage Worker will insert to MongoDB)
        if (this.natsClient) {
          this.natsClient
            .publish(`sensor.raw.${deviceId}`, {
              orgId: gateway.orgId.toString(),
              deviceId,
              data: triggerData,
              timestamp: now.toISOString(),
              source: 'modbus',
            })
            .catch((err: any) => {
              if (this.logger) {
                this.logger.warn(err, 'NATS publish failed for Modbus gateway');
              }
            });
        }

        // Dispatch to workflow triggers (synthetic state — no DB write here)
        if (this.triggerDispatcher) {
          const syntheticState = {
            _id: new mongoose.Types.ObjectId(),
            deviceId,
            orgId: gateway.orgId.toString(),
            data: triggerData,
            timestamp: now,
          };
          this.triggerDispatcher
            .dispatchDeviceStateBatch(gateway.orgId.toString(), deviceId, triggerData, syntheticState as any)
            .catch((err: any) => {
              if (this.logger) {
                this.logger.error(err, 'Workflow device state batch dispatch failed for Modbus gateway');
              }
            });
        }
      } catch (error) {
        console.error(`❌ Failed to process state for device ${deviceId}:`, (error as Error).message);
      }
    }
  }

  /**
   * Get or create device for register mapping
   */
  private async getOrCreateDevice(gateway: IModbusGateway, register: any): Promise<string> {
    // If deviceId is specified in register, use it
    if (register.deviceId) {
      return register.deviceId;
    }

    // Auto-register device if enabled
    if (gateway.deviceMapping.autoRegister) {
      const deviceName = `${gateway.deviceMapping.deviceIdPrefix || 'MODBUS_'}${register.name}`;
      const orgId = gateway.orgId.toString();

      // Check if device exists by name — use Device model directly to bypass application-scoped list
      const existing = await Device.findOne({
        orgId: new mongoose.Types.ObjectId(orgId),
        name: deviceName,
      }).lean();
      if (existing) {
        return existing.deviceId;
      }

      // Auto-registration requires an applicationId (ADR-036)
      if (!gateway.applicationId) {
        throw new Error(`Gateway "${gateway.name}" has no applicationId — set one to enable auto-device-registration`);
      }

      // Create new device
      const newDevice = await deviceService.create(orgId, {
        name: deviceName,
        applicationId: gateway.applicationId,
        tags: {
          protocol: gateway.protocol,
          source: 'modbus',
        },
        attributes: {
          value: register.dataType as 'number' | 'string' | 'boolean' | 'timestamp',
        },
      });

      console.log(`✅ Auto-registered device: ${newDevice.name} (${newDevice.deviceId})`);
      return newDevice.deviceId;
    }

    throw new Error(`No deviceId specified for register ${register.name} and auto-register is disabled`);
  }

  /**
   * Test gateway connection without starting polling
   */
  async testConnection(gatewayId: string): Promise<{ success: boolean; message: string }> {
    const gateway = await ModbusGateway.findById(gatewayId);
    if (!gateway) {
      throw new Error(`Gateway not found: ${gatewayId}`);
    }

    const client = new ModbusClientService();

    try {
      await client.connect(gateway.connection);
      await client.disconnect();

      return {
        success: true,
        message: `Successfully connected to ${gateway.getConnectionString()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get gateway status
   */
  getGatewayStatus(gatewayId: string): { running: boolean; connected: boolean } {
    const connection = this.connections.get(gatewayId);
    if (!connection) {
      return { running: false, connected: false };
    }

    return {
      running: true,
      connected: connection.client.isConnected(),
    };
  }

  /**
   * Get all running gateways
   */
  getRunningGateways(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Restore gateways that were running before a server restart.
   * Called once at startup — re-starts all gateways with polling.enabled = true.
   */
  async restoreRunningGateways(): Promise<void> {
    const gateways = await ModbusGateway.find({ 'polling.enabled': true });
    if (gateways.length === 0) return;

    console.log(`🔄 Restoring ${gateways.length} Modbus gateway(s) from database...`);
    for (const gateway of gateways) {
      try {
        await this.startGateway(gateway._id.toString());
      } catch (error) {
        console.error(`❌ Failed to restore gateway ${gateway.name}:`, (error as Error).message);
        // Mark as error so the UI reflects the real state
        gateway.status = 'error';
        gateway.lastError = `Failed to restore after restart: ${(error as Error).message}`;
        await gateway.save();
      }
    }
  }

  /**
   * Stop all gateways (for graceful shutdown)
   */
  async stopAllGateways(): Promise<void> {
    const gatewayIds = Array.from(this.connections.keys());
    console.log(`⏹️  Stopping ${gatewayIds.length} running gateways...`);

    for (const gatewayId of gatewayIds) {
      try {
        await this.stopGateway(gatewayId);
      } catch (error) {
        console.error(`Failed to stop gateway ${gatewayId}:`, error);
      }
    }
  }

  /**
   * Read single register manually (for testing)
   */
  async readRegister(gatewayId: string, registerName: string): Promise<number | boolean> {
    const connection = this.connections.get(gatewayId);
    if (!connection) {
      throw new Error(`Gateway not running: ${gatewayId}`);
    }

    const register = connection.gateway.registers.find((r) => r.name === registerName);
    if (!register) {
      throw new Error(`Register not found: ${registerName}`);
    }

    return await connection.client.readRegister(register);
  }
}

export const modbusGatewayManager = new ModbusGatewayManagerService();
