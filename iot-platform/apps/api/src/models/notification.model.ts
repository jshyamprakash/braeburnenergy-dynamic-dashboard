import { Schema, model, Document, Types } from 'mongoose';
import { ulid } from 'ulid';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type NotificationSource = 'workflow' | 'system';

export interface INotification extends Document {
  orgId: Types.ObjectId;
  notificationId: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  source: NotificationSource;
  workflowId?: string;
  workflowName?: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    notificationId: { type: String, required: true, unique: true, default: () => ulid() },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'INFO' },
    source: { type: String, enum: ['workflow', 'system'], default: 'workflow' },
    workflowId: { type: String },
    workflowName: { type: String },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for efficient per-org queries sorted by newest first
NotificationSchema.index({ orgId: 1, createdAt: -1 });

// 30-day TTL
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const Notification = model<INotification>('Notification', NotificationSchema);
