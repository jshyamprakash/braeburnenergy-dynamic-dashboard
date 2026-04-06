import mongoose, { Schema, Document } from 'mongoose';

// ==================== Types & Enums ====================

export type BacnetObjectType =
  | 'analogInput'
  | 'analogOutput'
  | 'analogValue'
  | 'binaryInput'
  | 'binaryOutput'
  | 'binaryValue'
  | 'multiStateInput'
  | 'multiStateOutput'
  | 'multiStateValue';

export type BacnetProperty =
  | 'presentValue'
  | 'statusFlags'
  | 'description'
  | 'units';

// ==================== Interfaces ====================

export interface IBacnetObject {
  objectType: BacnetObjectType;
  instanceNumber: number;
  property: BacnetProperty;
  field: string;            // Field name in sensor.raw data
  scale?: number;
  offset?: number;
  unit?: string;
  deviceId?: string;        // Target device ULID (overrides auto-register)
}

export interface IBacnetPolling {
  enabled: boolean;
  interval: number;         // ms
  onError: 'continue' | 'stop';
}

export interface IBacnetDeviceMapping {
  autoRegister: boolean;
  deviceIdPrefix?: string;
  defaultTags?: string[];
}

export interface IBacnetGateway extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  applicationId?: string;
  name: string;
  description?: string;

  host: string;             // Target device IP address
  port: number;             // BACnet/IP UDP port (default 47808)
  broadcastAddress?: string;// Network broadcast (e.g. 192.168.1.255)
  deviceInstance?: number;  // Remote BACnet device instance (optional, for directed reads)
  timeout: number;          // APDU timeout in ms (default 6000)

  objects: IBacnetObject[];
  polling: IBacnetPolling;
  deviceMapping: IBacnetDeviceMapping;

  processingOverrides?: { deltaPercent?: number; noiseThreshold?: number };

  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  lastError?: string;

  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;

  isConnected(): boolean;
}

// ==================== Schemas ====================

const BacnetObjectSchema = new Schema<IBacnetObject>({
  objectType: {
    type: String,
    required: true,
    enum: [
      'analogInput','analogOutput','analogValue',
      'binaryInput','binaryOutput','binaryValue',
      'multiStateInput','multiStateOutput','multiStateValue',
    ],
  },
  instanceNumber: { type: Number, required: true, min: 0 },
  property: {
    type: String,
    required: true,
    default: 'presentValue',
    enum: ['presentValue', 'statusFlags', 'description', 'units'],
  },
  field: { type: String, required: true },
  scale: { type: Number },
  offset: { type: Number },
  unit: { type: String },
  deviceId: { type: String },
}, { _id: false });

const BacnetPollingSchema = new Schema<IBacnetPolling>({
  enabled: { type: Boolean, required: true, default: true },
  interval: { type: Number, required: true, default: 10000, min: 100 },
  onError: { type: String, required: true, default: 'continue', enum: ['continue', 'stop'] },
}, { _id: false });

const BacnetDeviceMappingSchema = new Schema<IBacnetDeviceMapping>({
  autoRegister: { type: Boolean, required: true, default: true },
  deviceIdPrefix: { type: String },
  defaultTags: [{ type: String }],
}, { _id: false });

const BacnetGatewaySchema = new Schema<IBacnetGateway>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    applicationId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },

    host: { type: String, required: true },
    port: { type: Number, required: true, default: 47808 },
    broadcastAddress: { type: String },
    deviceInstance: { type: Number },
    timeout: { type: Number, required: true, default: 6000 },

    objects: [BacnetObjectSchema],
    polling: { type: BacnetPollingSchema, required: true },
    deviceMapping: { type: BacnetDeviceMappingSchema, required: true },

    processingOverrides: {
      type: {
        deltaPercent: { type: Number, min: 0, max: 1 },
        noiseThreshold: { type: Number, min: 0 },
      },
      required: false,
      default: undefined,
      _id: false,
    },

    status: {
      type: String,
      required: true,
      default: 'disconnected',
      enum: ['connected', 'disconnected', 'error'],
    },
    lastConnected: { type: Date },
    lastError: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

BacnetGatewaySchema.index({ orgId: 1, name: 1 });
BacnetGatewaySchema.index({ status: 1 });

BacnetGatewaySchema.methods.isConnected = function (): boolean {
  return this.status === 'connected';
};

export const BacnetGateway = mongoose.model<IBacnetGateway>('BacnetGateway', BacnetGatewaySchema);
