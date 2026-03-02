import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDeviceDerivedState extends Document {
  deviceId: string;
  derived: Record<string, any>;
  lastSeen: Date;
  sourceEventId?: Types.ObjectId;
  stale: boolean;
  staledAt?: Date | null;
}

const deviceDerivedStateSchema = new Schema<IDeviceDerivedState>(
  {
    deviceId: { type: String, required: true },
    derived: { type: Schema.Types.Mixed, default: {} },
    lastSeen: { type: Date, default: Date.now },
    sourceEventId: { type: Schema.Types.ObjectId },
    stale: { type: Boolean, default: false },
    staledAt: { type: Date, default: null },
  },
  {
    collection: 'device_derived_states',
  }
);

// Unique index: one derived-state document per device
deviceDerivedStateSchema.index({ deviceId: 1 }, { unique: true });

export const DeviceDerivedState = mongoose.model<IDeviceDerivedState>(
  'DeviceDerivedState',
  deviceDerivedStateSchema
);
