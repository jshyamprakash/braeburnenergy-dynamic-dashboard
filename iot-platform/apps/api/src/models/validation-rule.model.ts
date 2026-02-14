import { Schema, model, Document } from 'mongoose';

/**
 * ValidationRule Model
 *
 * EPA/AWWA-compliant data validation rules for sensor data quality assurance.
 * Defines acceptable ranges, tolerances, and validation criteria.
 */

export type ValidationType =
  | 'RANGE'              // Min/max value check
  | 'RATE_OF_CHANGE'     // Maximum change between readings
  | 'STUCK_VALUE'        // Detect unchanging values
  | 'SPIKE_DETECTION'    // Detect sudden spikes/drops
  | 'CALIBRATION_DUE'    // Check calibration expiry
  | 'GAP_DETECTION'      // Detect missing data gaps
  | 'CONSISTENCY';       // Cross-field consistency checks

export type SeverityLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface IValidationRule extends Document {
  name: string;
  description?: string;
  deviceId?: string;           // Specific device (optional, null = all devices)
  field: string;               // Data field to validate (e.g., 'temperature', 'pH')

  // Validation type and parameters
  validationType: ValidationType;
  parameters: {
    min?: number;              // Range: minimum value
    max?: number;              // Range: maximum value
    maxChange?: number;        // Rate of change: max delta between readings
    timeWindow?: number;       // Time window in seconds
    tolerance?: number;        // Tolerance for stuck value detection
    threshold?: number;        // Spike detection threshold
    calibrationInterval?: number; // Days between calibrations
    maxGap?: number;           // Maximum gap in seconds
  };

  // Quality impact
  severity: SeverityLevel;
  qualityFlag: string;         // Flag to add (e.g., 'OUT_OF_RANGE', 'RAPID_CHANGE')
  failureAction: 'FLAG' | 'REJECT' | 'ESTIMATE'; // What to do on validation failure

  // Compliance metadata
  standard?: string;           // e.g., 'EPA Method 120.1', 'AWWA C653'
  instrument?: string;         // Instrument type (e.g., 'pH meter', 'DO sensor')

  // Status
  isActive: boolean;
  appliedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const validationRuleSchema = new Schema<IValidationRule>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  deviceId: {
    type: String,
    index: true,
    // Null means applies to all devices
  },
  field: {
    type: String,
    required: true,
    index: true,
  },
  validationType: {
    type: String,
    required: true,
    enum: ['RANGE', 'RATE_OF_CHANGE', 'STUCK_VALUE', 'SPIKE_DETECTION', 'CALIBRATION_DUE', 'GAP_DETECTION', 'CONSISTENCY'],
  },
  parameters: {
    type: Schema.Types.Mixed,
    required: true,
  },
  severity: {
    type: String,
    required: true,
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    default: 'WARNING',
  },
  qualityFlag: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 50,
  },
  failureAction: {
    type: String,
    required: true,
    enum: ['FLAG', 'REJECT', 'ESTIMATE'],
    default: 'FLAG',
  },
  standard: {
    type: String,
    maxlength: 200,
  },
  instrument: {
    type: String,
    maxlength: 100,
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
  collection: 'validation_rules',
});

// Compound indexes
validationRuleSchema.index({ field: 1, validationType: 1 });
validationRuleSchema.index({ deviceId: 1, isActive: 1 });

export const ValidationRule = model<IValidationRule>('ValidationRule', validationRuleSchema);
