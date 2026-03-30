import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDeviceDerivedStateHistory extends Document {
  deviceId: string;
  derived: Record<string, any>;
  timestamp: Date;
  sourceEventId?: Types.ObjectId;
  /** Per-document expiry set at insert time from active RetentionPolicy (ADR-047) */
  expiresAt: Date;
}

const deviceDerivedStateHistorySchema = new Schema<IDeviceDerivedStateHistory>(
  {
    deviceId: { type: String, required: true },
    derived: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    sourceEventId: { type: Schema.Types.ObjectId },
    expiresAt: { type: Date, required: true }, // ADR-047: set at insert from RetentionPolicy
  },
  {
    collection: 'device_derived_state_history',
  }
);

// Compound index for fast limit queries by device, newest first
deviceDerivedStateHistorySchema.index({ deviceId: 1, timestamp: -1 });

// ADR-047: Per-document TTL — expiresAt set at insert from active RetentionPolicy.
// expireAfterSeconds: 0 means MongoDB deletes the document when expiresAt is reached.
// Replaces the previous hardcoded { timestamp: 1 } TTL index.
deviceDerivedStateHistorySchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export const DeviceDerivedStateHistory = mongoose.model<IDeviceDerivedStateHistory>(
  'DeviceDerivedStateHistory',
  deviceDerivedStateHistorySchema
);
