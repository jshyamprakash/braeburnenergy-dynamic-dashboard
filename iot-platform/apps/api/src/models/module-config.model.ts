import { Schema, model, Document, Types } from 'mongoose';

/**
 * Module Config Model (ADR-051)
 *
 * Singleton document — _id is always 'module-config'.
 * SuperAdmin controls which optional modules are enabled across all deployments.
 * Modules: combustion_dl | asset_life | be_agent
 */

export type LicenseModule = 'combustion_dl' | 'asset_life' | 'be_agent';

export const VALID_MODULES: LicenseModule[] = ['combustion_dl', 'asset_life', 'be_agent'];

export const MODULE_CONFIG_ID = 'module-config';

export interface IModuleConfig extends Document<Types.ObjectId | string> {
  _id: string;
  enabled: LicenseModule[];
  updatedAt: Date;
}

const moduleConfigSchema = new Schema<IModuleConfig>(
  {
    _id: { type: String },
    enabled: {
      type: [String],
      enum: VALID_MODULES,
      default: [],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: 'module_configs',
  }
);

export const ModuleConfig = model<IModuleConfig>('ModuleConfig', moduleConfigSchema);
