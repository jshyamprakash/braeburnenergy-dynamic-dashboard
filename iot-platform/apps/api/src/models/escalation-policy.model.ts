import { Schema, model, Document, Types } from 'mongoose';

/**
 * EscalationPolicy Model (ADR-059)
 *
 * Defines multi-tier escalation behaviour for unacknowledged alarms.
 * Tiers fire in order after delayMinutes of ACTIVE_UNACKED state.
 * alarmRuleId is optional — omit to apply to all alarms in the org.
 */

export type EscalationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface IEscalationTier {
  delayMinutes: number;
  channelIds: Types.ObjectId[];
  minimumSeverity: EscalationSeverity;
}

export interface IEscalationPolicy extends Document {
  orgId: Types.ObjectId;
  name: string;
  /** Optional: scope to a specific AlarmRule. Absent = applies to all org alarms */
  alarmRuleId?: Types.ObjectId;
  tiers: IEscalationTier[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const escalationTierSchema = new Schema<IEscalationTier>(
  {
    delayMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    channelIds: {
      type: [Schema.Types.ObjectId],
      ref: 'NotificationChannel',
      default: [],
    },
    minimumSeverity: {
      type: String,
      required: true,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      default: 'HIGH',
    },
  },
  { _id: false }
);

const escalationPolicySchema = new Schema<IEscalationPolicy>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    alarmRuleId: {
      type: Schema.Types.ObjectId,
      ref: 'AlarmRule',
      index: true,
    },
    tiers: {
      type: [escalationTierSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'escalation_policies',
  }
);

escalationPolicySchema.index({ orgId: 1, isActive: 1 });
escalationPolicySchema.index({ orgId: 1, alarmRuleId: 1 });

export const EscalationPolicy = model<IEscalationPolicy>(
  'EscalationPolicy',
  escalationPolicySchema
);
