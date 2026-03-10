import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  ClientSession,
  ClientSubscription,
  ClientMonitoredItem,
  DataValue,
} from 'node-opcua';
import type { IOpcuaGateway, IOpcuaNodeMapping } from '../models';

/**
 * OpcuaClientService
 *
 * Handles OPC UA communication with industrial devices.
 * Supports both polling and subscription modes.
 */

export class OpcuaClientService {
  private client: OPCUAClient;
  private session: ClientSession | null = null;
  private subscription: ClientSubscription | null = null;
  private monitoredItems: Map<string, ClientMonitoredItem> = new Map();
  private gateway: IOpcuaGateway;
  private isConnected: boolean = false;
  private dataCache: Map<string, any> = new Map();

  constructor(gateway: IOpcuaGateway) {
    this.gateway = gateway;

    // Create OPC UA client with connection strategy
    this.client = OPCUAClient.create({
      applicationName: 'IoT Platform OPC UA Client',
      connectionStrategy: {
        maxRetry: gateway.connectionStrategy?.maxRetry || 3,
        initialDelay: gateway.connectionStrategy?.initialDelay || 1000,
        maxDelay: gateway.connectionStrategy?.maxDelay || 10000,
      },
      securityMode: this.getSecurityMode(gateway.securityMode),
      securityPolicy: this.getSecurityPolicy(gateway.securityPolicy),
      endpointMustExist: false,
      keepSessionAlive: gateway.keepSessionAlive !== false,
      requestedSessionTimeout: gateway.requestedSessionTimeout || 60000,
    });
  }

  /**
   * Convert security mode string to OPC UA enum
   */
  private getSecurityMode(mode: string): MessageSecurityMode {
    switch (mode) {
      case 'Sign':
        return MessageSecurityMode.Sign;
      case 'SignAndEncrypt':
        return MessageSecurityMode.SignAndEncrypt;
      case 'None':
      default:
        return MessageSecurityMode.None;
    }
  }

  /**
   * Convert security policy string to OPC UA enum
   */
  private getSecurityPolicy(policy: string): SecurityPolicy {
    switch (policy) {
      case 'Basic128Rsa15':
        return SecurityPolicy.Basic128Rsa15;
      case 'Basic256':
        return SecurityPolicy.Basic256;
      case 'Basic256Sha256':
        return SecurityPolicy.Basic256Sha256;
      case 'Aes128_Sha256_RsaOaep':
        return SecurityPolicy.Aes128_Sha256_RsaOaep;
      case 'Aes256_Sha256_RsaPss':
        return SecurityPolicy.Aes256_Sha256_RsaPss;
      case 'None':
      default:
        return SecurityPolicy.None;
    }
  }

  /**
   * Connect to OPC UA server
   */
  async connect(): Promise<void> {
    try {
      // Connect to endpoint
      await this.client.connect(this.gateway.endpointUrl);

      // Create session
      if (this.gateway.username && this.gateway.password) {
        // Username/password authentication
        this.session = await (this.client as any).createSession({
          type: 'UserName',
          userName: this.gateway.username,
          password: this.gateway.password,
        });
      } else {
        // Anonymous authentication
        this.session = await (this.client as any).createSession();
      }

      this.isConnected = true;

      // If subscription mode, create subscription
      if (this.gateway.monitoringMode === 'Subscription') {
        await this.createSubscription();
      }
    } catch (error: any) {
      this.isConnected = false;
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  /**
   * Disconnect from OPC UA server
   */
  async disconnect(): Promise<void> {
    try {
      // Delete subscription if exists
      if (this.subscription) {
        await this.subscription.terminate();
        this.subscription = null;
      }

      // Close session
      if (this.session) {
        await this.session.close();
        this.session = null;
      }

      // Disconnect client
      await this.client.disconnect();
      this.isConnected = false;
      this.monitoredItems.clear();
      this.dataCache.clear();
    } catch (error: any) {
      throw new Error(`Failed to disconnect: ${error.message}`);
    }
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected && this.session !== null;
  }

  /**
   * Create subscription for data change notifications
   */
  private async createSubscription(): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const settings = this.gateway.subscriptionSettings || {};

    this.subscription = await this.session.createSubscription2({
      requestedPublishingInterval: settings.publishingInterval || 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: settings.maxNotificationsPerPublish || 0,
      publishingEnabled: true,
      priority: settings.priority || 10,
    });

    // Monitor each node
    for (const mapping of this.gateway.nodeMappings) {
      const monitoredItem = await (this.subscription as any).monitor(
        {
          nodeId: mapping.nodeId,
          attributeId: AttributeIds.Value,
        },
        {
          samplingInterval: settings.samplingInterval || 100,
          discardOldest: true,
          queueSize: settings.queueSize || 10,
        }
      );

      // Handle data change events
      (monitoredItem as any).on('changed', (dataValue: DataValue) => {
        const value = this.extractValue(dataValue, mapping);
        this.dataCache.set(mapping.field, value);
      });

      this.monitoredItems.set(mapping.field, monitoredItem);
    }
  }

  /**
   * Read all nodes (polling mode)
   */
  async read(): Promise<Record<string, any>> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const data: Record<string, any> = {};

    for (const mapping of this.gateway.nodeMappings) {
      try {
        const dataValue = await this.session.read({
          nodeId: mapping.nodeId,
          attributeId: AttributeIds.Value,
        });

        const value = this.extractValue(dataValue, mapping);
        data[mapping.field] = value;
      } catch (error: any) {
        console.error(`Failed to read node ${mapping.nodeId}:`, error.message);
        data[mapping.field] = null;
      }
    }

    return data;
  }

  /**
   * Get cached data (subscription mode)
   */
  getCachedData(): Record<string, any> {
    const data: Record<string, any> = {};

    for (const mapping of this.gateway.nodeMappings) {
      data[mapping.field] = this.dataCache.get(mapping.field) ?? null;
    }

    return data;
  }

  /**
   * Extract and transform value from DataValue
   */
  private extractValue(dataValue: DataValue, mapping: IOpcuaNodeMapping): any {
    if (!dataValue.value || dataValue.value.value === null || dataValue.value.value === undefined) {
      return null;
    }

    let value = dataValue.value.value;

    // Apply scaling and offset for numeric values
    if (typeof value === 'number') {
      const scale = mapping.scale || 1;
      const offset = mapping.offset || 0;
      value = value * scale + offset;
    }

    return value;
  }

  /**
   * Read value from a specific node
   */
  async readNode(nodeId: string): Promise<any> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const dataValue = await this.session.read({
      nodeId,
      attributeId: AttributeIds.Value,
    });

    if (!dataValue.value || dataValue.value.value === null || dataValue.value.value === undefined) {
      return null;
    }

    return dataValue.value.value;
  }

  /**
   * Write value to node
   */
  async write(nodeId: string, value: any): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    await this.session.write({
      nodeId,
      attributeId: AttributeIds.Value,
      value: {
        value: {
          dataType: 'Double', // TODO: Detect data type
          value,
        },
      },
    });
  }

  /**
   * Write value to a specific node
   */
  async writeNode(nodeId: string, value: any): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    await this.session.write({
      nodeId,
      attributeId: AttributeIds.Value,
      value: {
        value: {
          dataType: 'Double', // TODO: Detect data type
          value,
        },
      },
    });
  }

  /**
   * Browse server nodes (for discovery)
   */
  async browseNode(nodeId: string = 'RootFolder'): Promise<any[]> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const browseResult = await this.session.browse(nodeId);

    return browseResult.references?.map((ref: any) => ({
      nodeId: ref.nodeId.toString(),
      browseName: ref.browseName.toString(),
      displayName: ref.displayName?.text || '',
      nodeClass: ref.nodeClass,
    })) || [];
  }
}
