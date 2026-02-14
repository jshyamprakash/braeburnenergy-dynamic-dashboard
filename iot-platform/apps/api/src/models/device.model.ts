import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDevice extends Document {
  orgId: Types.ObjectId;
  deviceId: string;
  name: string;
  tags: string[];
  attributes: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    deviceId: { type: String, required: true },
    name: { type: String, required: true },
    tags: { type: [String], default: [] },
    attributes: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    collection: 'devices',
  }
);

// Indexes
deviceSchema.index({ orgId: 1, deviceId: 1 }, { unique: true });
deviceSchema.index({ orgId: 1, tags: 1 });
deviceSchema.index({ name: 'text' });

export const Device = mongoose.model<IDevice>('Device', deviceSchema);
