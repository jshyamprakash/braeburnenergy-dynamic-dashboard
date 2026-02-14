import { Schema, model, Document } from 'mongoose';

/**
 * RetentionPolicy Model
 *
 * EPA-compliant data retention policy management.
 * Defines how long different types of data should be retained.
 */

export type RetentionTier = 'hot' | 'warm' | 'cold' | 'archive';
export type DataCategory = 'device_states' | 'audit_logs' | 'alarms' | 'calibration_records';

export interface IRetentionPolicy extends Document {
  name: string;
  description?: string;
  category: DataCategory;

  // Retention periods in seconds
  hotStorageDuration: number;     // Fast access (e.g., 90 days)
  warmStorageDuration: number;    // Medium access (e.g., 1 year)
  coldStorageDuration: number;    // Slow access (e.g., 5 years)
  totalRetentionDuration: number; // Total before deletion

  // Archive settings
  archiveEnabled: boolean;
  archiveDestination?: string;    // S3 bucket, MinIO endpoint, etc.

  // Compression settings
  compressionEnabled: boolean;
  compressionThreshold: number;   // Days after which to compress

  // Compliance metadata
  regulatoryRequirement?: string; // e.g., "EPA Water Quality Standards"
  minimumRetentionDays: number;   // Legal minimum

  // Status
  isActive: boolean;
  appliedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const retentionPolicySchema = new Schema<IRetentionPolicy>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  category: {
    type: String,
    required: true,
    enum: ['device_states', 'audit_logs', 'alarms', 'calibration_records'],
    index: true,
  },
  hotStorageDuration: {
    type: Number,
    required: true,
    min: 0,
    // Default: 90 days = 7,776,000 seconds
    default: 7776000,
  },
  warmStorageDuration: {
    type: Number,
    required: true,
    min: 0,
    // Default: 1 year = 31,536,000 seconds
    default: 31536000,
  },
  coldStorageDuration: {
    type: Number,
    required: true,
    min: 0,
    // Default: 5 years = 157,680,000 seconds
    default: 157680000,
  },
  totalRetentionDuration: {
    type: Number,
    required: true,
    min: 0,
    // Default: 5 years = 157,680,000 seconds
    default: 157680000,
  },
  archiveEnabled: {
    type: Boolean,
    required: true,
    default: false,
  },
  archiveDestination: {
    type: String,
    maxlength: 500,
  },
  compressionEnabled: {
    type: Boolean,
    required: true,
    default: true,
  },
  compressionThreshold: {
    type: Number,
    required: true,
    min: 0,
    // Default: Compress after 90 days
    default: 90,
  },
  regulatoryRequirement: {
    type: String,
    maxlength: 200,
  },
  minimumRetentionDays: {
    type: Number,
    required: true,
    min: 0,
    // EPA requires 3-5 years, default to 5 years (1825 days)
    default: 1825,
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
  appliedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  collection: 'retention_policies',
});

// Indexes
retentionPolicySchema.index({ category: 1, isActive: 1 });

// Validation: Total retention must be >= minimum retention
retentionPolicySchema.pre('save', function(next) {
  const minimumRetentionSeconds = this.minimumRetentionDays * 24 * 60 * 60;

  if (this.totalRetentionDuration < minimumRetentionSeconds) {
    next(new Error(
      `Total retention (${this.totalRetentionDuration}s) must be at least ` +
      `${minimumRetentionSeconds}s (${this.minimumRetentionDays} days) for regulatory compliance`
    ));
  } else {
    next();
  }
});

export const RetentionPolicy = model<IRetentionPolicy>('RetentionPolicy', retentionPolicySchema);
