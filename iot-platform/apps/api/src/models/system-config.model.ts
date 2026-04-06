import { Schema, model, Document, Types } from 'mongoose';

/**
 * SystemConfig Model (ADR-053)
 *
 * Generic key-value store for runtime platform configuration overrides.
 * _id is the config key (e.g. 'superadmin_public_key').
 * Allows runtime mutation of settings that would otherwise require image rebuild.
 */
export interface ISystemConfig extends Document<Types.ObjectId | string> {
  _id: string;
  value: string;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    _id: { type: String },
    value: { type: String, required: true },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: 'system_configs',
  }
);

export const SystemConfig = model<ISystemConfig>('SystemConfig', systemConfigSchema);
