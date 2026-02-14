import { Schema, model, Document } from 'mongoose';

/**
 * OpcuaGateway Model
 *
 * Configuration for OPC UA gateways for industrial device communication.
 * Supports OPC UA subscriptions, browsing, and secure connections.
 */

export type OpcuaSecurityMode = 'None' | 'Sign' | 'SignAndEncrypt';
export type OpcuaSecurityPolicy =
  | 'None'
  | 'Basic128Rsa15'
  | 'Basic256'
  | 'Basic256Sha256'
  | 'Aes128_Sha256_RsaOaep'
  | 'Aes256_Sha256_RsaPss';

export type OpcuaMonitoringMode = 'Polling' | 'Subscription';

export interface IOpcuaNodeMapping {
  field: string;                      // Data field name (e.g., 'temperature', 'pressure')
  nodeId: string;                     // OPC UA Node ID (e.g., 'ns=2;s=Temperature')
  dataType?: string;                  // Expected data type (optional)
  scale?: number;                     // Multiplier for value
  offset?: number;                    // Offset to add after scaling
  unit?: string;                      // Unit of measurement
  description?: string;
}

export interface IOpcuaGateway extends Document {
  // Identification
  name: string;
  description?: string;
  deviceId: string;                   // IoT Platform device ID (ULID)

  // Connection settings
  endpointUrl: string;                // OPC UA endpoint URL (e.g., 'opc.tcp://192.168.1.100:4840')

  // Security settings
  securityMode: OpcuaSecurityMode;
  securityPolicy: OpcuaSecurityPolicy;
  username?: string;                  // Optional username for authentication
  password?: string;                  // Optional password (stored encrypted)
  certificatePath?: string;           // Path to client certificate
  privateKeyPath?: string;            // Path to private key

  // Connection parameters
  connectionStrategy: {
    maxRetry?: number;                // Max connection retries (default 3)
    initialDelay?: number;            // Initial retry delay in ms (default 1000)
    maxDelay?: number;                // Max retry delay in ms (default 10000)
  };
  requestedSessionTimeout?: number;   // Session timeout in ms (default 60000)
  keepSessionAlive?: boolean;         // Keep session alive (default true)

  // Monitoring configuration
  monitoringMode: OpcuaMonitoringMode;  // Polling or Subscription
  pollingInterval?: number;           // Polling interval in ms (if mode = Polling)

  // Subscription settings (if mode = Subscription)
  subscriptionSettings?: {
    publishingInterval?: number;      // Publishing interval in ms (default 1000)
    maxNotificationsPerPublish?: number; // Max notifications (default 0 = unlimited)
    priority?: number;                // Subscription priority (default 10)
    samplingInterval?: number;        // Sampling interval in ms (default 100)
    queueSize?: number;               // Monitored item queue size (default 10)
  };

  // Node mappings
  nodeMappings: IOpcuaNodeMapping[];

  // Status
  isActive: boolean;
  isConnected: boolean;
  lastPollTimestamp?: Date;
  lastSuccessTimestamp?: Date;
  lastErrorTimestamp?: Date;
  lastError?: string;
  consecutiveFailures: number;

  // Statistics
  totalReads: number;
  successfulReads: number;
  failedReads: number;
  averageResponseTime?: number;       // Average response time in ms

  // Metadata
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const opcuaNodeMappingSchema = new Schema({
  field: {
    type: String,
    required: true,
    trim: true,
  },
  nodeId: {
    type: String,
    required: true,
    trim: true,
  },
  dataType: {
    type: String,
    trim: true,
  },
  scale: {
    type: Number,
    default: 1,
  },
  offset: {
    type: Number,
    default: 0,
  },
  unit: {
    type: String,
    maxlength: 20,
  },
  description: {
    type: String,
    maxlength: 200,
  },
}, { _id: false });

const opcuaGatewaySchema = new Schema<IOpcuaGateway>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  endpointUrl: {
    type: String,
    required: true,
    trim: true,
  },
  securityMode: {
    type: String,
    required: true,
    enum: ['None', 'Sign', 'SignAndEncrypt'],
    default: 'None',
  },
  securityPolicy: {
    type: String,
    required: true,
    enum: ['None', 'Basic128Rsa15', 'Basic256', 'Basic256Sha256', 'Aes128_Sha256_RsaOaep', 'Aes256_Sha256_RsaPss'],
    default: 'None',
  },
  username: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    // TODO: Encrypt password before storing
  },
  certificatePath: {
    type: String,
    trim: true,
  },
  privateKeyPath: {
    type: String,
    trim: true,
  },
  connectionStrategy: {
    type: {
      maxRetry: {
        type: Number,
        min: 0,
        max: 10,
        default: 3,
      },
      initialDelay: {
        type: Number,
        min: 0,
        max: 60000,
        default: 1000,
      },
      maxDelay: {
        type: Number,
        min: 0,
        max: 60000,
        default: 10000,
      },
    },
    default: () => ({
      maxRetry: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    }),
  },
  requestedSessionTimeout: {
    type: Number,
    min: 1000,
    max: 3600000,
    default: 60000,
  },
  keepSessionAlive: {
    type: Boolean,
    default: true,
  },
  monitoringMode: {
    type: String,
    required: true,
    enum: ['Polling', 'Subscription'],
    default: 'Subscription',
  },
  pollingInterval: {
    type: Number,
    min: 100,
    max: 3600000,
    default: 5000,
  },
  subscriptionSettings: {
    type: {
      publishingInterval: {
        type: Number,
        min: 100,
        max: 60000,
        default: 1000,
      },
      maxNotificationsPerPublish: {
        type: Number,
        min: 0,
        max: 1000,
        default: 0,
      },
      priority: {
        type: Number,
        min: 0,
        max: 255,
        default: 10,
      },
      samplingInterval: {
        type: Number,
        min: 0,
        max: 60000,
        default: 100,
      },
      queueSize: {
        type: Number,
        min: 1,
        max: 1000,
        default: 10,
      },
    },
    default: () => ({
      publishingInterval: 1000,
      maxNotificationsPerPublish: 0,
      priority: 10,
      samplingInterval: 100,
      queueSize: 10,
    }),
  },
  nodeMappings: {
    type: [opcuaNodeMappingSchema],
    required: true,
    validate: {
      validator: function(mappings: IOpcuaNodeMapping[]) {
        return mappings.length > 0;
      },
      message: 'At least one node mapping is required',
    },
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
  isConnected: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
  },
  lastPollTimestamp: {
    type: Date,
  },
  lastSuccessTimestamp: {
    type: Date,
  },
  lastErrorTimestamp: {
    type: Date,
  },
  lastError: {
    type: String,
    maxlength: 500,
  },
  consecutiveFailures: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalReads: {
    type: Number,
    default: 0,
    min: 0,
  },
  successfulReads: {
    type: Number,
    default: 0,
    min: 0,
  },
  failedReads: {
    type: Number,
    default: 0,
    min: 0,
  },
  averageResponseTime: {
    type: Number,
    min: 0,
  },
  tags: {
    type: [String],
    default: [],
    index: true,
  },
}, {
  timestamps: true,
  collection: 'opcua_gateways',
});

// Compound indexes
opcuaGatewaySchema.index({ deviceId: 1, isActive: 1 });
opcuaGatewaySchema.index({ isActive: 1, isConnected: 1 });

// Virtual: Success rate
opcuaGatewaySchema.virtual('successRate').get(function() {
  if (this.totalReads === 0) return 0;
  return (this.successfulReads / this.totalReads) * 100;
});

export const OpcuaGateway = model<IOpcuaGateway>('OpcuaGateway', opcuaGatewaySchema);
