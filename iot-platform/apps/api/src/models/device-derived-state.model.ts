import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDeviceDerivedState extends Document {
  deviceId: string;
  stateId: string;       // References the time series document _id (for joining)
  orgId: Types.ObjectId;
  timestamp: Date;       // Same timestamp as the originating DeviceState
  derived: Record<string, any>;
}

const deviceDerivedStateSchema = new Schema<IDeviceDerivedState>({
  deviceId: { type: String, required: true },
  stateId:  { type: String, required: true },
  orgId:    { type: Schema.Types.ObjectId, required: true },
  timestamp:{ type: Date, required: true },
  derived:  { type: Schema.Types.Mixed, default: {} },
}, {
  collection: 'device_derived_states',
  timestamps: { updatedAt: 'updatedAt' },
});

deviceDerivedStateSchema.index({ deviceId: 1, stateId: 1 }, { unique: true });
deviceDerivedStateSchema.index({ deviceId: 1, timestamp: -1 });

export const DeviceDerivedState = mongoose.model<IDeviceDerivedState>(
  'DeviceDerivedState', deviceDerivedStateSchema
);
