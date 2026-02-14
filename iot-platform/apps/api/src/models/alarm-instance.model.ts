import { Schema, model, Document, Types } from 'mongoose';
import type { AlarmPriority } from './alarm-rule.model';

/**
 * AlarmInstance Model
 *
 * ISA-18.2 compliant alarm instance tracking.
 * Represents individual alarm occurrences with state transitions.
 */

export type AlarmState =
  | 'ACTIVE_UNACKED'      // Active, not yet acknowledged
  | 'ACTIVE_ACKED'        // Active, acknowledged by operator
  | 'CLEARED_UNACKED'     // Condition cleared, not acknowledged (RTN - return to normal)
  | 'CLEARED_ACKED'       // Condition cleared and acknowledged (resolved)
  | 'SHELVED';            // Temporarily suppressed

export interface IAlarmStateTransition {
  fromState: AlarmState | null;     // null for initial state
  toState: AlarmState;
  timestamp: Date;
  userId?: string;                  // User who triggered transition
  comment?: string;                 // Optional comment
}

export interface IAlarmInstance extends Document {
  // Alarm identification
  alarmRuleId: Types.ObjectId;      // Reference to AlarmRule
  tagName: string;                  // ISA-18.2 alarm tag (denormalized for performance)
  deviceId: string;                 // Device that triggered alarm
  field: string;                    // Field that triggered alarm

  // Trigger context
  triggerValue: number | string;    // Value that triggered the alarm
  triggerTimestamp: Date;           // When alarm was triggered
  triggerStateId?: string;          // Device state ID that triggered alarm

  // Current state
  state: AlarmState;
  priority: AlarmPriority;          // Denormalized from rule for performance
  requiresAcknowledgment: boolean;  // Denormalized from rule

  // Timestamps
  activeTimestamp: Date;            // When alarm became active
  acknowledgedTimestamp?: Date;     // When acknowledged
  clearedTimestamp?: Date;          // When condition cleared
  resolvedTimestamp?: Date;         // When fully resolved (cleared + acked)

  // Acknowledgment
  acknowledgedBy?: string;          // User ID who acknowledged
  acknowledgmentComment?: string;   // Acknowledgment notes

  // Shelving
  isShelved: boolean;
  shelvedTimestamp?: Date;
  shelvedBy?: string;
  shelvedReason?: string;
  shelvedUntil?: Date;

  // State history
  stateTransitions: IAlarmStateTransition[];

  // ISA-18.2 Metrics
  durationActive?: number;          // Milliseconds alarm was active
  durationUnacknowledged?: number;  // Milliseconds before acknowledgment
  responseTime?: number;            // Milliseconds to acknowledgment

  // Notification tracking
  notificationsSent: Array<{
    channel: string;
    timestamp: Date;
    success: boolean;
    error?: string;
  }>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const alarmInstanceSchema = new Schema<IAlarmInstance>({
  alarmRuleId: {
    type: Schema.Types.ObjectId,
    ref: 'AlarmRule',
    required: true,
    index: true,
  },
  tagName: {
    type: String,
    required: true,
    uppercase: true,
    index: true,
  },
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  field: {
    type: String,
    required: true,
    index: true,
  },
  triggerValue: {
    type: Schema.Types.Mixed,
    required: true,
  },
  triggerTimestamp: {
    type: Date,
    required: true,
    index: true,
  },
  triggerStateId: {
    type: String,
  },
  state: {
    type: String,
    required: true,
    enum: ['ACTIVE_UNACKED', 'ACTIVE_ACKED', 'CLEARED_UNACKED', 'CLEARED_ACKED', 'SHELVED'],
    default: 'ACTIVE_UNACKED',
    index: true,
  },
  priority: {
    type: String,
    required: true,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
    index: true,
  },
  requiresAcknowledgment: {
    type: Boolean,
    required: true,
    default: true,
  },
  activeTimestamp: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true,
  },
  acknowledgedTimestamp: {
    type: Date,
    index: true,
  },
  clearedTimestamp: {
    type: Date,
    index: true,
  },
  resolvedTimestamp: {
    type: Date,
    index: true,
  },
  acknowledgedBy: {
    type: String,
  },
  acknowledgmentComment: {
    type: String,
    maxlength: 500,
  },
  isShelved: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
  },
  shelvedTimestamp: {
    type: Date,
  },
  shelvedBy: {
    type: String,
  },
  shelvedReason: {
    type: String,
    maxlength: 500,
  },
  shelvedUntil: {
    type: Date,
  },
  stateTransitions: {
    type: [{
      fromState: {
        type: String,
        enum: ['ACTIVE_UNACKED', 'ACTIVE_ACKED', 'CLEARED_UNACKED', 'CLEARED_ACKED', 'SHELVED', null],
      },
      toState: {
        type: String,
        required: true,
        enum: ['ACTIVE_UNACKED', 'ACTIVE_ACKED', 'CLEARED_UNACKED', 'CLEARED_ACKED', 'SHELVED'],
      },
      timestamp: {
        type: Date,
        required: true,
        default: () => new Date(),
      },
      userId: String,
      comment: {
        type: String,
        maxlength: 500,
      },
    }],
    default: [],
  },
  durationActive: {
    type: Number,
  },
  durationUnacknowledged: {
    type: Number,
  },
  responseTime: {
    type: Number,
  },
  notificationsSent: {
    type: [{
      channel: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        required: true,
        default: () => new Date(),
      },
      success: {
        type: Boolean,
        required: true,
      },
      error: String,
    }],
    default: [],
  },
}, {
  timestamps: true,
  collection: 'alarm_instances',
});

// Compound indexes for common queries
alarmInstanceSchema.index({ deviceId: 1, state: 1, priority: 1 });
alarmInstanceSchema.index({ state: 1, priority: 1, activeTimestamp: -1 });
alarmInstanceSchema.index({ alarmRuleId: 1, state: 1 });
alarmInstanceSchema.index({ state: 1, acknowledgedTimestamp: 1 });
alarmInstanceSchema.index({ resolvedTimestamp: 1 }); // For TTL or archival

// Virtual: Is alarm currently active
alarmInstanceSchema.virtual('isActive').get(function() {
  return this.state === 'ACTIVE_UNACKED' || this.state === 'ACTIVE_ACKED';
});

// Virtual: Is alarm resolved
alarmInstanceSchema.virtual('isResolved').get(function() {
  return this.state === 'CLEARED_ACKED';
});

// Virtual: Needs acknowledgment
alarmInstanceSchema.virtual('needsAcknowledgment').get(function() {
  return this.requiresAcknowledgment &&
         (this.state === 'ACTIVE_UNACKED' || this.state === 'CLEARED_UNACKED');
});

// Pre-save middleware to calculate metrics
alarmInstanceSchema.pre('save', function(next) {
  // Calculate duration active (if cleared)
  if (this.clearedTimestamp && !this.durationActive) {
    this.durationActive = this.clearedTimestamp.getTime() - this.activeTimestamp.getTime();
  }

  // Calculate duration unacknowledged (if acknowledged)
  if (this.acknowledgedTimestamp && !this.durationUnacknowledged) {
    this.durationUnacknowledged = this.acknowledgedTimestamp.getTime() - this.activeTimestamp.getTime();
  }

  // Calculate response time (same as duration unacknowledged)
  if (this.acknowledgedTimestamp && !this.responseTime) {
    this.responseTime = this.acknowledgedTimestamp.getTime() - this.activeTimestamp.getTime();
  }

  next();
});

export const AlarmInstance = model<IAlarmInstance>('AlarmInstance', alarmInstanceSchema);
