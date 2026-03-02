import mongoose from 'mongoose';
import { ModbusGateway, IModbusGateway } from '../models/modbus-gateway.model';
import { ModbusClientService } from './modbus-client.service';
import { deviceService } from './device.service';
import { deviceStateService } from './device-state.service';
import { Device } from '../models/device.model';

/**
 * ModbusGatewayManager Service
 *
 * Manages Modbus gateway connections, polling, and data mapping.
 * Handles automatic device registration and state updates.
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

      // Update gateway status
      gateway.status = 'connected';
      gateway.lastConnected = new Date();
      gateway.lastError = undefined;
      await gateway.save();

      // Store connection
      this.connections.set(gatewayId, connection);

      // Start polling if enabled
      if (gateway.polling.enabled) {
        this.startPolling(gatewayId);
      }

      console.log(`✅ Modbus gateway started: ${gateway.name} (${gateway.getConnectionString()})`);
    } catch (error) {
      gateway.status = 'error';
      gateway.lastError = (error as Error).message;
      await gateway.save();
      throw error;
    }
  }

  /**
   * Stop gateway connection and polling
   */
  async stopGateway(gatewayId: string): Promise<void> {
    const connection = this.connections.get(gatewayId);
    if (!connection) {
      throw new Error(`Gateway not running: ${gatewayId}`);
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
   */
  private async pollRegisters(connection: GatewayConnection): Promise<void> {
    const { gateway, client } = connection;

    for (const register of gateway.registers) {
      try {
        // Read register value
        const value = await client.readRegister(register);

        // Get or create device
        const deviceId = await this.getOrCreateDevice(gateway, register);

        // Create device state
        await deviceStateService.create(gateway.orgId.toString(), {
          deviceId,
          data: {
            [register.name]: value,
            ...(register.unit && { [`${register.name}_unit`]: register.unit }),
          },
          timestamp: new Date(),
        });

        console.log(`📊 ${gateway.name} > ${register.name}: ${value}${register.unit || ''}`);
      } catch (error) {
        console.error(`❌ Failed to read register ${register.name}:`, (error as Error).message);
        // Continue with next register
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

      // Create new device
      const newDevice = await deviceService.create(orgId, {
        name: deviceName,
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
