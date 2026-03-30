import mongoose, { Schema, Document } from 'mongoose';

/**
 * MQTT Gateway Model
 *
 * Connects to an MQTT broker, subscribes to topic patterns,
 * and maps incoming payloads to device states.
 */

// ==================== Types & Enums ====================

export type MqttQoS = 0 | 1 | 2;
export type MqttPayloadFormat = 'json' | 'raw';
export type MqttGatewayStatus = 'connected' | 'disconnected' | 'error';

// ==================== Interfaces ====================

export interface IMqttTopicMapping {
  topic: string;          // Topic pattern (supports + and # wildcards)
  field: string;          // Field name to store in device state data
  deviceId: string;       // Target device ULID
  payloadFormat: MqttPayloadFormat; // 'json' (extract field key) or 'raw' (whole payload)
  jsonPath?: string;      // JSON key to extract (e.g. "temperature") — used when payloadFormat='json'
  scale?: number;         // Scale factor (multiply)
  offset?: number;        // Offset (add after scale)
  unit?: string;          // Unit label stored alongside value
  qos: MqttQoS;          // QoS level for this subscription
  processingOverrides?: { // Per-topic noise/delta overrides for Processing Engine (GAP-H3)
    noiseThreshold?: number;  // Overrides global NOISE_THRESHOLD env var for this topic
    deltaPercent?: number;    // Overrides global DELTA_PERCENT env var for this topic
  };
}

export interface IMqttAuth {
  username?: string;
  password?: string;
}

export interface IMqttTls {
  enabled: boolean;
  rejectUnauthorized?: boolean; // Default true
  caCert?: string;              // CA certificate PEM
  clientCert?: string;          // Client certificate PEM
  clientKey?: string;           // Client private key PEM
}

export interface IMqttGateway extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  applicationId?: string;

  name: string;
  description?: string;

  // Broker connection
  brokerUrl: string;      // e.g. mqtt://broker:1883 | mqtts://broker:8883 | ws://broker:9001
  clientId: string;       // MQTT client ID (auto-generated if blank)
  keepalive: number;      // Keepalive interval in seconds (default 60)
  connectTimeout: number; // Connect timeout in ms (default 10000)
  reconnectPeriod: number;// Reconnect period in ms (default 5000)

  // Auth & TLS
  auth: IMqttAuth;
  tls: IMqttTls;

  // Topic mappings
  topicMappings: IMqttTopicMapping[];

  // Status
  status: MqttGatewayStatus;
  isActive: boolean;
  lastConnected?: Date;
  lastError?: string;
  lastMessageAt?: Date;
  totalMessagesReceived: number;

  createdAt: Date;
  updatedAt: Date;
}

// ==================== Schema ====================

const MqttTopicMappingSchema = new Schema<IMqttTopicMapping>({
  topic: { type: String, required: true },
  field: { type: String, required: true },
  deviceId: { type: String, required: true },
  payloadFormat: { type: String, enum: ['json', 'raw'], default: 'json' },
  jsonPath: { type: String },
  scale: { type: Number },
  offset: { type: Number },
  unit: { type: String },
  qos: { type: Number, enum: [0, 1, 2], default: 0 },
  processingOverrides: {
    noiseThreshold: { type: Number, min: 0 },
    deltaPercent: { type: Number, min: 0 },
  },
}, { _id: false });

const MqttGatewaySchema = new Schema<IMqttGateway>({
  orgId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
  applicationId: { type: String },

  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  brokerUrl: { type: String, required: true },
  clientId: { type: String, default: () => `iot-platform-${Date.now()}` },
  keepalive: { type: Number, default: 60 },
  connectTimeout: { type: Number, default: 10000 },
  reconnectPeriod: { type: Number, default: 5000 },

  auth: {
    username: { type: String },
    password: { type: String },
  },
  tls: {
    enabled: { type: Boolean, default: false },
    rejectUnauthorized: { type: Boolean, default: true },
    caCert: { type: String },
    clientCert: { type: String },
    clientKey: { type: String },
  },

  topicMappings: [MqttTopicMappingSchema],

  status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
  isActive: { type: Boolean, default: true },
  lastConnected: { type: Date },
  lastError: { type: String },
  lastMessageAt: { type: Date },
  totalMessagesReceived: { type: Number, default: 0 },
}, {
  timestamps: true,
});

MqttGatewaySchema.index({ orgId: 1, status: 1 });
MqttGatewaySchema.index({ orgId: 1, applicationId: 1 });

export const MqttGateway = mongoose.model<IMqttGateway>('MqttGateway', MqttGatewaySchema);
