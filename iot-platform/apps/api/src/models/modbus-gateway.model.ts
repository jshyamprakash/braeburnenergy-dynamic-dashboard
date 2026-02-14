import mongoose, { Schema, Document } from 'mongoose';

/**
 * Modbus Gateway Model
 *
 * Represents a Modbus TCP/RTU gateway for connecting to industrial devices.
 * Supports automatic polling, device registration, and data mapping.
 */

// ==================== Types & Enums ====================

export type ModbusProtocol = 'tcp' | 'rtu';
export type ModbusRegisterType = 'holding' | 'input' | 'coil' | 'discrete';
export type ModbusDataType = 'int16' | 'uint16' | 'int32' | 'uint32' | 'float' | 'boolean';

// ==================== Interfaces ====================

export interface IModbusConnection {
  host: string;                           // IP address (TCP) or serial port (RTU)
  port: number;                           // Port number (default: 502 for TCP)
  unitId: number;                         // Modbus unit/slave ID (1-247)
  timeout: number;                        // Connection timeout in ms
  retryDelay: number;                     // Retry delay in ms

  // RTU-specific (optional)
  baudRate?: number;                      // Baud rate (default: 9600)
  dataBits?: number;                      // Data bits (7 or 8)
  stopBits?: number;                      // Stop bits (1 or 2)
  parity?: 'none' | 'even' | 'odd';       // Parity
}

export interface IModbusPolling {
  enabled: boolean;                       // Enable/disable polling
  interval: number;                       // Polling interval in ms
  onError: 'continue' | 'stop';           // Behavior on error
}

export interface IModbusRegister {
  name: string;                           // Register name (e.g., "temperature")
  address: number;                        // Register address (0-65535)
  type: ModbusRegisterType;               // Register type
  dataType: ModbusDataType;               // Data type
  scale?: number;                         // Scale factor (multiply)
  offset?: number;                        // Offset (add after scale)
  unit?: string;                          // Unit of measurement
  deviceId?: string;                      // Target device ID (ULID)
}

// Alias for backward compatibility
export type IModbusRegisterMapping = IModbusRegister;

export interface IModbusDeviceMapping {
  autoRegister: boolean;                  // Automatically create devices
  deviceIdPrefix?: string;                // Prefix for auto-generated device IDs
  defaultTags?: string[];                 // Default tags for auto-created devices
}

export interface IModbusGateway extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;         // Organization ID (multi-tenancy)
  name: string;                           // Gateway name
  description?: string;                   // Optional description
  protocol: ModbusProtocol;               // Modbus protocol

  connection: IModbusConnection;          // Connection configuration
  polling: IModbusPolling;                // Polling configuration
  registers: IModbusRegister[];           // Register mappings
  deviceMapping: IModbusDeviceMapping;    // Device mapping configuration

  status: 'connected' | 'disconnected' | 'error'; // Connection status
  lastConnected?: Date;                   // Last successful connection
  lastError?: string;                     // Last error message

  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;    // User who created the gateway

  // Instance methods
  isConnected(): boolean;
  getConnectionString(): string;
}

// ==================== Schemas ====================

const ModbusConnectionSchema = new Schema<IModbusConnection>({
  host: { type: String, required: true },
  port: { type: Number, required: true, default: 502 },
  unitId: { type: Number, required: true, default: 1, min: 1, max: 247 },
  timeout: { type: Number, required: true, default: 5000 },
  retryDelay: { type: Number, required: true, default: 3000 },

  // RTU-specific (optional)
  baudRate: { type: Number, default: 9600 },
  dataBits: { type: Number, default: 8, enum: [7, 8] },
  stopBits: { type: Number, default: 1, enum: [1, 2] },
  parity: { type: String, default: 'none', enum: ['none', 'even', 'odd'] },
}, { _id: false });

const ModbusPollingSchema = new Schema<IModbusPolling>({
  enabled: { type: Boolean, required: true, default: true },
  interval: { type: Number, required: true, default: 5000, min: 1000 }, // Minimum 1 second
  onError: { type: String, required: true, default: 'continue', enum: ['continue', 'stop'] },
}, { _id: false });

const ModbusRegisterSchema = new Schema<IModbusRegister>({
  name: { type: String, required: true },
  address: { type: Number, required: true, min: 0, max: 65535 },
  type: {
    type: String,
    required: true,
    enum: ['holding', 'input', 'coil', 'discrete']
  },
  dataType: {
    type: String,
    required: true,
    enum: ['int16', 'uint16', 'int32', 'uint32', 'float', 'boolean']
  },
  scale: { type: Number },
  offset: { type: Number },
  unit: { type: String },
  deviceId: { type: String }, // ULID
}, { _id: false });

const ModbusDeviceMappingSchema = new Schema<IModbusDeviceMapping>({
  autoRegister: { type: Boolean, required: true, default: true },
  deviceIdPrefix: { type: String },
  defaultTags: [{ type: String }],
}, { _id: false });

const ModbusGatewaySchema = new Schema<IModbusGateway>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true
    },
    name: { type: String, required: true },
    description: { type: String },
    protocol: { type: String, required: true, enum: ['tcp', 'rtu'] },

    connection: { type: ModbusConnectionSchema, required: true },
    polling: { type: ModbusPollingSchema, required: true },
    registers: [ModbusRegisterSchema],
    deviceMapping: { type: ModbusDeviceMappingSchema, required: true },

    status: {
      type: String,
      required: true,
      default: 'disconnected',
      enum: ['connected', 'disconnected', 'error']
    },
    lastConnected: { type: Date },
    lastError: { type: String },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// ==================== Indexes ====================

// Compound index for organization-scoped queries
ModbusGatewaySchema.index({ orgId: 1, name: 1 });

// Index for status queries (find all connected gateways)
ModbusGatewaySchema.index({ status: 1 });

// Index for protocol queries
ModbusGatewaySchema.index({ protocol: 1 });

// ==================== Instance Methods ====================

/**
 * Check if gateway is currently connected
 */
ModbusGatewaySchema.methods.isConnected = function(): boolean {
  return this.status === 'connected';
};

/**
 * Get connection URL string for logging
 */
ModbusGatewaySchema.methods.getConnectionString = function(): string {
  if (this.protocol === 'tcp') {
    return `modbus://${this.connection.host}:${this.connection.port}`;
  } else {
    return `modbus-rtu://${this.connection.host}@${this.connection.baudRate}`;
  }
};

// ==================== Static Methods ====================

/**
 * Find all gateways for an organization
 */
ModbusGatewaySchema.statics.findByOrg = function(orgId: mongoose.Types.ObjectId) {
  return this.find({ orgId }).sort({ createdAt: -1 });
};

/**
 * Find all connected gateways
 */
ModbusGatewaySchema.statics.findConnected = function() {
  return this.find({ status: 'connected' });
};

/**
 * Find all gateways with polling enabled
 */
ModbusGatewaySchema.statics.findPolling = function() {
  return this.find({
    'polling.enabled': true,
    status: { $ne: 'error' }
  });
};

// ==================== Export ====================

export const ModbusGateway = mongoose.model<IModbusGateway>('ModbusGateway', ModbusGatewaySchema);
