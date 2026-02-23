import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IApplication extends Document {
  orgId: Types.ObjectId;
  applicationId: string; // ULID — user-facing identifier
  name: string;
  description?: string;
  slug: string; // URL-safe, unique within org
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    applicationId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 255 },
    description: { type: String },
    slug: { type: String, required: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'applications',
  }
);

// Indexes
applicationSchema.index({ orgId: 1, applicationId: 1 }, { unique: true });
applicationSchema.index({ orgId: 1, slug: 1 }, { unique: true });
applicationSchema.index({ orgId: 1, isActive: 1 });

export const Application = mongoose.model<IApplication>('Application', applicationSchema);
