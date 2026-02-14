import { Schema, model, Document } from 'mongoose';

/**
 * AlarmRule Model
 *
 * ISA-18.2 compliant alarm rule definitions for process monitoring.
 * Defines conditions that trigger alarms and their properties.
 */

export type AlarmPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlarmConditionType =
  | 'THRESHOLD'           // Value exceeds/falls below threshold
  | 'RANGE'               // Value outside acceptable range
  | 'DEVIATION'           // Value deviates from setpoint
  | 'RATE_OF_CHANGE'      // Change rate exceeds limit
  | 'QUALITY'             // Data quality status triggers alarm
  | 'COMMUNICATION'       // Device communication loss
  | 'CALCULATION';        // Custom calculation/expression

export type AlarmOperator =
  | 'GREATER_THAN'        // >
  | 'GREATER_EQUAL'       // >=
  | 'LESS_THAN'           // <
  | 'LESS_EQUAL'          // <=
  | 'EQUAL'               // ==
  | 'NOT_EQUAL'           // !=
  | 'BETWEEN'             // min <= value <= max
  | 'OUTSIDE';            // value < min OR value > max

export interface IAlarmRule extends Document {
  // Identification
  name: string;
  description?: string;
  tagName: string;                    // ISA-18.2 alarm tag (e.g., "TT-101-HH" for high-high temperature)

  // Scope
  deviceId?: string;                  // Specific device (null = applies to matching devices)
  deviceTags?: string[];              // Device tags to match (OR logic)
  field: string;                      // Data field to monitor (e.g., 'temperature', 'pressure')

  // Condition
  conditionType: AlarmConditionType;
  operator: AlarmOperator;
  parameters: {
    threshold?: number;               // Single threshold value
    min?: number;                     // Range/deviation min
    max?: number;                     // Range/deviation max
    setpoint?: number;                // Deviation setpoint
    deadband?: number;                // Hysteresis/deadband to prevent chattering
    timeDelay?: number;               // Alarm delay in seconds (debounce)
    qualityStatus?: string;           // Quality status to trigger on
    expression?: string;              // Custom calculation expression
  };

  // Priority & Response
  priority: AlarmPriority;
  requiresAcknowledgment: boolean;    // ISA-18.2: must be acknowledged
  autoShelveAfter?: number;           // Auto-shelve duration in seconds (optional)

  // Notifications
  notificationChannels: string[];     // ['email', 'sms', 'webhook', 'websocket']
  notificationRecipients?: string[];  // Email addresses or user IDs

  // ISA-18.2 Compliance
  rationalization?: string;           // Alarm rationalization documentation
  consequence?: string;               // Consequence of not responding
  correctiveAction?: string;          // Expected operator action
  isaClass?: 'ALARM' | 'ADVISORY' | 'INFORMATION';  // ISA-18.2 classification

  // Status
  isActive: boolean;
  isEnabled: boolean;                 // Temporarily enable/disable without deleting
  isShelved: boolean;                 // Shelved status (suppressed)
  shelvedUntil?: Date;                // Auto-unshelve timestamp
  shelvedBy?: string;                 // User who shelved
  shelvedReason?: string;             // Shelving justification

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const alarmRuleSchema = new Schema<IAlarmRule>({
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
  tagName: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    maxlength: 50,
    index: true,
  },
  deviceId: {
    type: String,
    index: true,
  },
  deviceTags: {
    type: [String],
    default: [],
    index: true,
  },
  field: {
    type: String,
    required: true,
    index: true,
  },
  conditionType: {
    type: String,
    required: true,
    enum: ['THRESHOLD', 'RANGE', 'DEVIATION', 'RATE_OF_CHANGE', 'QUALITY', 'COMMUNICATION', 'CALCULATION'],
  },
  operator: {
    type: String,
    required: true,
    enum: ['GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'EQUAL', 'NOT_EQUAL', 'BETWEEN', 'OUTSIDE'],
  },
  parameters: {
    type: Schema.Types.Mixed,
    required: true,
  },
  priority: {
    type: String,
    required: true,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
    default: 'MEDIUM',
    index: true,
  },
  requiresAcknowledgment: {
    type: Boolean,
    required: true,
    default: true,
  },
  autoShelveAfter: {
    type: Number,
    min: 0,
  },
  notificationChannels: {
    type: [String],
    default: ['websocket'],
    enum: {
      values: ['email', 'sms', 'webhook', 'websocket'],
      message: '{VALUE} is not a supported notification channel',
    },
  },
  notificationRecipients: {
    type: [String],
    default: [],
  },
  rationalization: {
    type: String,
    maxlength: 1000,
  },
  consequence: {
    type: String,
    maxlength: 500,
  },
  correctiveAction: {
    type: String,
    maxlength: 500,
  },
  isaClass: {
    type: String,
    enum: ['ALARM', 'ADVISORY', 'INFORMATION'],
    default: 'ALARM',
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
  isEnabled: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
  isShelved: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
  },
  shelvedUntil: {
    type: Date,
    index: true,
  },
  shelvedBy: {
    type: String,
  },
  shelvedReason: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
  collection: 'alarm_rules',
});

// Compound indexes for common queries
alarmRuleSchema.index({ deviceId: 1, isActive: 1, isEnabled: 1, isShelved: 1 });
alarmRuleSchema.index({ field: 1, priority: 1 });
alarmRuleSchema.index({ deviceTags: 1, isActive: 1 });

// Pre-save middleware to handle auto-unshelving
alarmRuleSchema.pre('save', function(next) {
  // Auto-unshelve if shelvedUntil has passed
  if (this.isShelved && this.shelvedUntil && this.shelvedUntil < new Date()) {
    this.isShelved = false;
    this.shelvedUntil = undefined;
    this.shelvedBy = undefined;
    this.shelvedReason = undefined;
  }
  next();
});

export const AlarmRule = model<IAlarmRule>('AlarmRule', alarmRuleSchema);
