import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDevice extends Document {
  orgId: Types.ObjectId;
  applicationId?: Types.ObjectId; // Optional FK to Application (ADR-023)
  deviceId: string;
  name: string;
  /** Static metadata key-value pairs, e.g. { model: "X1", mfg: "Acme" } */
  tags: Record<string, string>;
  /** Device data schema: field name → data type ("number"|"string"|"boolean"|"timestamp") */
  attributes: Record<string, string> | null;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application' }, // Optional (ADR-023)
    deviceId: { type: String, required: true },
    name: { type: String, required: true },
    tags: { type: Map, of: String, default: {} },
    attributes: { type: Map, of: String, default: null },
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
