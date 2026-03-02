import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDeviceDerivedStateHistory extends Document {
  deviceId: string;
  derived: Record<string, any>;
  timestamp: Date;
  sourceEventId?: Types.ObjectId;
}

const deviceDerivedStateHistorySchema = new Schema<IDeviceDerivedStateHistory>(
  {
    deviceId: { type: String, required: true },
    derived: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    sourceEventId: { type: Schema.Types.ObjectId },
  },
  {
    collection: 'device_derived_state_history',
  }
);

// Compound index for fast limit queries by device, newest first
deviceDerivedStateHistorySchema.index({ deviceId: 1, timestamp: -1 });

// 90-day TTL — same as workflow executions
deviceDerivedStateHistorySchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 }
);

export const DeviceDerivedStateHistory = mongoose.model<IDeviceDerivedStateHistory>(
  'DeviceDerivedStateHistory',
  deviceDerivedStateHistorySchema
);
