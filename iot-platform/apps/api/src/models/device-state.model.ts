import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * Data Quality Status (EPA/AWWA compliant)
 */
export type QualityStatus = 'GOOD' | 'BAD' | 'QUESTIONABLE' | 'ESTIMATED';

/**
 * Data Quality Flags
 */
export interface IQualityMetadata {
  status: QualityStatus;
  flags: string[];           // e.g., ['OUT_OF_RANGE', 'RAPID_CHANGE', 'CALIBRATION_DUE']
  score?: number;            // 0-100 quality score
  validatedAt?: Date;
  validatedBy?: string;      // User ID or 'system'
  comment?: string;          // Manual quality comment
}

export interface IDeviceState extends Document {
  timestamp: Date;
  metadata: {
    deviceId: string;
    orgId: Types.ObjectId;
  };
  data: Record<string, any>;
  quality?: IQualityMetadata; // Data quality metadata
}

const deviceStateSchema = new Schema<IDeviceState>(
  {
    timestamp: { type: Date, default: Date.now, required: true },
    metadata: {
      deviceId: { type: String, required: true },
      orgId: { type: Schema.Types.ObjectId, required: true },
    },
    data: { type: Schema.Types.Mixed, required: true },
    quality: {
      status: {
        type: String,
        enum: ['GOOD', 'BAD', 'QUESTIONABLE', 'ESTIMATED'],
        default: 'GOOD',
      },
      flags: { type: [String], default: [] },
      score: { type: Number, min: 0, max: 100 },
      validatedAt: { type: Date },
      validatedBy: { type: String },
      comment: { type: String, maxlength: 500 },
    },
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'metadata',
      granularity: 'seconds',
    },
    collection: 'device_states',
  }
);

// Compound index for efficient lookups: orgId + deviceId + timestamp
deviceStateSchema.index({ 'metadata.orgId': 1, 'metadata.deviceId': 1, timestamp: -1 });

export const DeviceState = mongoose.model<IDeviceState>('DeviceState', deviceStateSchema);
