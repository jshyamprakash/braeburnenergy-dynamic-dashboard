import mongoose, { Schema, type Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'organizations',
  }
);

// Indexes
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ createdAt: -1 });

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
