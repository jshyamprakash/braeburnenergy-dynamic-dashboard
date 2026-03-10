import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDevice extends Document {
  orgId: Types.ObjectId;
  applicationId?: string; // Optional FK to Application — stores ULID (ADR-023)
  deviceId: string;
  name: string;
  /** Static metadata key-value pairs, e.g. { model: "X1", mfg: "Acme" } */
  tags: Record<string, string>;
  /** Device data schema: field name → data type ("number"|"string"|"boolean"|"timestamp") */
  attributes: Record<string, string> | null;
  /** Last time a state was received from this device (ADR-041) */
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    applicationId: { type: String, index: true }, // Optional FK — stores ULID (ADR-023)
    deviceId: { type: String, required: true },
    name: { type: String, required: true },
    tags: { type: Map, of: String, default: {} },
    attributes: { type: Map, of: String, default: null },
    lastSeenAt: { type: Date, index: true },
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
deviceSchema.index({ orgId: 1, lastSeenAt: 1 }); // ADR-041: heartbeat poll query

export const Device = mongoose.model<IDevice>('Device', deviceSchema);
