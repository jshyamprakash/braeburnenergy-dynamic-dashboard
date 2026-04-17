import { Schema, model, Document, Types } from 'mongoose';

/**
 * NotificationChannel Model (ADR-059)
 *
 * Stores outbound notification channel configurations.
 * Channels are org-scoped and referenced by EscalationPolicy tiers.
 */

export type NotificationChannelType = 'email' | 'webhook' | 'in-app';

export interface INotificationChannel extends Document {
  orgId: Types.ObjectId;
  name: string;
  type: NotificationChannelType;
  /** type=email: { to: string }  |  type=webhook: { url: string, headers?: Record<string,string> }  |  type=in-app: {} */
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationChannelSchema = new Schema<INotificationChannel>(
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
    type: {
      type: String,
      required: true,
      enum: ['email', 'webhook', 'in-app'],
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'notification_channels',
  }
);

notificationChannelSchema.index({ orgId: 1, type: 1 });
notificationChannelSchema.index({ orgId: 1, isActive: 1 });

export const NotificationChannel = model<INotificationChannel>(
  'NotificationChannel',
  notificationChannelSchema
);
