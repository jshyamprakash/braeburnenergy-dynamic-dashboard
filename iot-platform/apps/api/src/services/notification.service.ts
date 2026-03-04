import mongoose from 'mongoose';
import { Notification, type INotification, type NotificationSeverity, type NotificationSource } from '../models/notification.model';

export interface CreateNotificationDTO {
  title: string;
  message: string;
  severity?: NotificationSeverity;
  source?: NotificationSource;
  workflowId?: string;
  workflowName?: string;
}

export interface ListNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface NotificationListResult {
  data: INotification[];
  total: number;
  unreadCount: number;
}

export class NotificationService {
  async create(orgId: string, dto: CreateNotificationDTO): Promise<INotification> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    const notification = new Notification({
      orgId: orgIdObj,
      title: dto.title,
      message: dto.message,
      severity: dto.severity ?? 'INFO',
      source: dto.source ?? 'workflow',
      workflowId: dto.workflowId,
      workflowName: dto.workflowName,
    });
    return notification.save();
  }

  async list(orgId: string, options: ListNotificationsOptions = {}): Promise<NotificationListResult> {
    const { limit = 20, offset = 0, unreadOnly = false } = options;
    const orgIdObj = new mongoose.Types.ObjectId(orgId);

    const filter: Record<string, any> = { orgId: orgIdObj };
    if (unreadOnly) filter.read = false;

    const [data, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean() as any,
      Notification.countDocuments(filter),
      Notification.countDocuments({ orgId: orgIdObj, read: false }),
    ]);

    return { data, total, unreadCount };
  }

  async markRead(orgId: string, notificationId: string): Promise<void> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    await Notification.updateOne({ orgId: orgIdObj, notificationId }, { $set: { read: true } });
  }

  async markAllRead(orgId: string): Promise<void> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    await Notification.updateMany({ orgId: orgIdObj, read: false }, { $set: { read: true } });
  }

  async deleteAll(orgId: string): Promise<void> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    await Notification.deleteMany({ orgId: orgIdObj });
  }
}

export const notificationService = new NotificationService();
