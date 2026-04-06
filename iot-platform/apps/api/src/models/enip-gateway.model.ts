import mongoose, { Schema, Document } from 'mongoose';

// ==================== Types & Enums ====================

export type EnipDataType = 'REAL' | 'DINT' | 'INT' | 'SINT' | 'BOOL' | 'DWORD' | 'WORD' | 'BYTE';

// ==================== Interfaces ====================

export interface IEnipTag {
  tagName: string;          // PLC tag path (e.g. 'Temperature_1', 'Program:Main.Pressure')
  field: string;            // Field name in sensor.raw data
  dataType?: EnipDataType;  // Expected data type (optional, for conversion hints)
  scale?: number;
  offset?: number;
  unit?: string;
  deviceId?: string;        // Target device ULID (overrides auto-register)
}

export interface IEnipPolling {
  enabled: boolean;
  interval: number;         // ms
  onError: 'continue' | 'stop';
}

export interface IEnipDeviceMapping {
  autoRegister: boolean;
  deviceIdPrefix?: string;
  defaultTags?: string[];
}

export interface IEnipGateway extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  applicationId?: string;
  name: string;
  description?: string;

  host: string;             // PLC IP address
  port: number;             // EtherNet/IP TCP port (default 44818)
  slot: number;             // CPU slot in the chassis (ControlLogix: 0-15, default 0)
  timeout: number;          // Connection timeout in ms

  tags: IEnipTag[];
  polling: IEnipPolling;
  deviceMapping: IEnipDeviceMapping;

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

const EnipTagSchema = new Schema<IEnipTag>({
  tagName: { type: String, required: true },
  field: { type: String, required: true },
  dataType: {
    type: String,
    enum: ['REAL', 'DINT', 'INT', 'SINT', 'BOOL', 'DWORD', 'WORD', 'BYTE'],
  },
  scale: { type: Number },
  offset: { type: Number },
  unit: { type: String },
  deviceId: { type: String },
}, { _id: false });

const EnipPollingSchema = new Schema<IEnipPolling>({
  enabled: { type: Boolean, required: true, default: true },
  interval: { type: Number, required: true, default: 5000, min: 100 },
  onError: { type: String, required: true, default: 'continue', enum: ['continue', 'stop'] },
}, { _id: false });

const EnipDeviceMappingSchema = new Schema<IEnipDeviceMapping>({
  autoRegister: { type: Boolean, required: true, default: true },
  deviceIdPrefix: { type: String },
  defaultTags: [{ type: String }],
}, { _id: false });

const EnipGatewaySchema = new Schema<IEnipGateway>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    applicationId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },

    host: { type: String, required: true },
    port: { type: Number, required: true, default: 44818 },
    slot: { type: Number, required: true, default: 0, min: 0, max: 15 },
    timeout: { type: Number, required: true, default: 10000 },

    tags: [EnipTagSchema],
    polling: { type: EnipPollingSchema, required: true },
    deviceMapping: { type: EnipDeviceMappingSchema, required: true },

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

EnipGatewaySchema.index({ orgId: 1, name: 1 });
EnipGatewaySchema.index({ status: 1 });

EnipGatewaySchema.methods.isConnected = function (): boolean {
  return this.status === 'connected';
};

export const EnipGateway = mongoose.model<IEnipGateway>('EnipGateway', EnipGatewaySchema);
