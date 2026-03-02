import { OpcuaGateway, type IOpcuaGateway } from '../models';
import { OpcuaClientService } from './opcua-client.service';
import { DataQualityService } from './data-quality.service';
import { AlarmService } from './alarm.service';
import { deviceStateService } from './device-state.service';

// Default organization ID for POC (multi-tenancy frontend not implemented)
const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * OpcuaGatewayManager
 *
 * Manages OPC UA gateway instances with automatic polling/subscription.
 * Handles connection lifecycle, data acquisition, quality validation, and alarm evaluation.
 */

interface GatewayInstance {
  gateway: IOpcuaGateway;
  client: OpcuaClientService;
  pollingTimer?: NodeJS.Timeout;
  isRunning: boolean;
  consecutiveFailures: number;
}

export class OpcuaGatewayManager {
  private instances: Map<string, GatewayInstance> = new Map();
  private dataQualityService: DataQualityService;
  private alarmService: AlarmService;

  constructor() {
    this.dataQualityService = new DataQualityService();
    this.alarmService = new AlarmService();
  }

  /**
   * Start OPC UA gateway
   */
  async startGateway(gatewayId: string): Promise<void> {
    const gateway = await OpcuaGateway.findById(gatewayId);
    if (!gateway) {
      throw new Error(`Gateway ${gatewayId} not found`);
    }

    if (!gateway.isActive) {
      throw new Error(`Gateway ${gatewayId} is not active`);
    }

    // Stop if already running
    if (this.instances.has(gatewayId)) {
      await this.stopGateway(gatewayId);
    }

    // Create client
    const client = new OpcuaClientService(gateway);

    try {
      // Connect to OPC UA server
      await client.connect();

      // Update status
      gateway.isConnected = true;
      gateway.consecutiveFailures = 0;
      gateway.lastSuccessTimestamp = new Date();
      await gateway.save();

      const instance: GatewayInstance = {
        gateway,
        client,
        isRunning: true,
        consecutiveFailures: 0,
      };

      this.instances.set(gatewayId, instance);

      // Start polling if in Polling mode (Subscription mode is passive)
      if (gateway.monitoringMode === 'Polling') {
        const interval = gateway.pollingInterval || 5000;
        instance.pollingTimer = setInterval(() => {
          this.pollGateway(gatewayId).catch(console.error);
        }, interval);
      }

      console.log(`✅ OPC UA Gateway "${gateway.name}" started (${gateway.monitoringMode} mode)`);
    } catch (error: any) {
      gateway.isConnected = false;
      gateway.lastErrorTimestamp = new Date();
      gateway.lastError = error.message;
      gateway.consecutiveFailures += 1;
      await gateway.save();

      throw new Error(`Failed to start gateway: ${error.message}`);
    }
  }

  /**
   * Stop OPC UA gateway
   */
  async stopGateway(gatewayId: string): Promise<void> {
    const instance = this.instances.get(gatewayId);
    if (!instance) {
      throw new Error(`Gateway ${gatewayId} is not running`);
    }

    // Stop polling timer
    if (instance.pollingTimer) {
      clearInterval(instance.pollingTimer);
      instance.pollingTimer = undefined;
    }

    // Disconnect client
    try {
      await instance.client.disconnect();
    } catch (error: any) {
      console.error(`Error disconnecting gateway ${gatewayId}:`, error.message);
    }

    // Update status
    instance.isRunning = false;
    const gateway = await OpcuaGateway.findById(gatewayId);
    if (gateway) {
      gateway.isConnected = false;
      await gateway.save();
    }

    this.instances.delete(gatewayId);
    console.log(`✅ OPC UA Gateway "${instance.gateway.name}" stopped`);
  }

  /**
   * Restart OPC UA gateway
   */
  async restartGateway(gatewayId: string): Promise<void> {
    try {
      await this.stopGateway(gatewayId);
    } catch (error) {
      // Ignore stop errors
    }
    await this.startGateway(gatewayId);
  }

  /**
   * Poll OPC UA gateway (for Polling mode or manual trigger)
   */
  private async pollGateway(gatewayId: string): Promise<void> {
    const instance = this.instances.get(gatewayId);
    if (!instance || !instance.isRunning) {
      return;
    }

    const { gateway, client } = instance;
    const startTime = Date.now();

    try {
      // Check connection status
      if (!client.getConnectionStatus()) {
        throw new Error('OPC UA client not connected');
      }

      // Read data (polling mode) or get cached data (subscription mode)
      const data = gateway.monitoringMode === 'Polling'
        ? await client.read()
        : client.getCachedData();

      const duration = Date.now() - startTime;

      // Validate data quality
      const validationResult = await this.dataQualityService.validateDeviceState(
        gateway.deviceId,
        data,
        new Date()
      );

      // Create device state with quality metadata
      const state = await deviceStateService.create(DEFAULT_ORG_ID, {
        deviceId: gateway.deviceId,
        data: (validationResult as any).data || data,
        timestamp: new Date(),
      } as any);

      // Evaluate alarm conditions
      const device = { tags: [] }; // TODO: Fetch device tags
      const triggeredAlarms = await this.alarmService.evaluateDeviceState(
        gateway.deviceId,
        device.tags,
        (validationResult as any).data || data,
        state._id.toString(),
        new Date()
      );

      if (triggeredAlarms.length > 0) {
        console.log(`⚠️  OPC UA Gateway "${gateway.name}" triggered ${triggeredAlarms.length} alarm(s)`);
      }

      // Update statistics
      gateway.totalReads += 1;
      gateway.successfulReads += 1;
      gateway.consecutiveFailures = 0;
      gateway.lastPollTimestamp = new Date();
      gateway.lastSuccessTimestamp = new Date();

      // Update average response time (exponential moving average)
      if (gateway.averageResponseTime === undefined) {
        gateway.averageResponseTime = duration;
      } else {
        gateway.averageResponseTime = gateway.averageResponseTime * 0.8 + duration * 0.2;
      }

      await gateway.save();
      instance.consecutiveFailures = 0;
    } catch (error: any) {
      gateway.totalReads += 1;
      gateway.failedReads += 1;
      gateway.consecutiveFailures += 1;
      gateway.lastErrorTimestamp = new Date();
      gateway.lastError = error.message;
      await gateway.save();

      instance.consecutiveFailures += 1;

      console.error(`❌ OPC UA Gateway "${gateway.name}" poll failed:`, error.message);

      // Auto-reconnect after 3 consecutive failures
      if (instance.consecutiveFailures >= 3) {
        console.log(`🔄 Attempting to reconnect OPC UA Gateway "${gateway.name}"...`);
        try {
          await this.restartGateway(gatewayId);
        } catch (reconnectError: any) {
          console.error(`Failed to reconnect: ${reconnectError.message}`);
        }
      }
    }
  }

  /**
   * Get gateway status
   */
  getGatewayStatus(gatewayId: string): { isRunning: boolean; isConnected: boolean } | null {
    const instance = this.instances.get(gatewayId);
    if (!instance) {
      return null;
    }

    return {
      isRunning: instance.isRunning,
      isConnected: instance.client.getConnectionStatus(),
    };
  }

  /**
   * Get all running gateways
   */
  getRunningGateways(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Start all active gateways (called on server startup)
   */
  async startAllGateways(): Promise<void> {
    const gateways = await OpcuaGateway.find({ isActive: true });

    console.log(`🚀 Starting ${gateways.length} active OPC UA gateway(s)...`);

    for (const gateway of gateways) {
      try {
        await this.startGateway(gateway._id.toString());
      } catch (error: any) {
        console.error(`Failed to start gateway "${gateway.name}":`, error.message);
      }
    }
  }

  /**
   * Stop all gateways (called on server shutdown)
   */
  async stopAllGateways(): Promise<void> {
    const gatewayIds = Array.from(this.instances.keys());

    console.log(`🛑 Stopping ${gatewayIds.length} OPC UA gateway(s)...`);

    for (const gatewayId of gatewayIds) {
      try {
        await this.stopGateway(gatewayId);
      } catch (error: any) {
        console.error(`Failed to stop gateway ${gatewayId}:`, error.message);
      }
    }
  }

  /**
   * Test gateway connection without starting monitoring
   */
  async testConnection(gatewayId: string): Promise<{ success: boolean; message: string }> {
    const gateway = await OpcuaGateway.findById(gatewayId);
    if (!gateway) {
      throw new Error(`Gateway not found: ${gatewayId}`);
    }

    const client = new OpcuaClientService(gateway);

    try {
      await client.connect();
      await client.disconnect();

      return {
        success: true,
        message: `Successfully connected to ${gateway.endpointUrl}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Browse OPC UA server nodes
   */
  async browseNodes(gatewayId: string, nodeId: string = 'RootFolder'): Promise<any[]> {
    const instance = this.instances.get(gatewayId);

    // If gateway is running, use existing client
    if (instance && instance.isRunning) {
      return instance.client.browseNode(nodeId);
    }

    // Otherwise, create temporary connection
    const gateway = await OpcuaGateway.findById(gatewayId);
    if (!gateway) {
      throw new Error(`Gateway not found: ${gatewayId}`);
    }

    const client = new OpcuaClientService(gateway);
    try {
      await client.connect();
      const nodes = await client.browseNode(nodeId);
      await client.disconnect();
      return nodes;
    } catch (error: any) {
      throw new Error(`Failed to browse nodes: ${error.message}`);
    }
  }

  /**
   * Read data manually (for testing)
   */
  async readData(gatewayId: string): Promise<Record<string, any>> {
    const instance = this.instances.get(gatewayId);
    if (!instance || !instance.isRunning) {
      throw new Error(`Gateway ${gatewayId} is not running`);
    }

    const { gateway, client } = instance;

    // Read data based on monitoring mode
    if (gateway.monitoringMode === 'Polling') {
      return await client.read();
    } else {
      return client.getCachedData();
    }
  }
}

// Singleton instance
export const opcuaGatewayManager = new OpcuaGatewayManager();
