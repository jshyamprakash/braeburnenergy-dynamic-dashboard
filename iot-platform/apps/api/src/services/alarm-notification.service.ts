import nodemailer from 'nodemailer';
import type { Server as SocketIoServer } from 'socket.io';
import type { Logger } from 'pino';
import mongoose from 'mongoose';
import { NotificationChannel } from '../models/notification-channel.model';
import type { INotificationChannel } from '../models/notification-channel.model';
import type { IAlarmInstance } from '../models/alarm-instance.model';
import { notificationService } from './notification.service';
import { config } from '../config/config';

/**
 * AlarmNotificationService (ADR-059)
 *
 * Fire-and-forget outbound notification dispatch.
 * Supports three channel types: email (nodemailer), webhook (fetch), in-app (Socket.io).
 *
 * Stub modes:
 *   email   → skips silently when config.smtp.host is unset
 *   webhook → logs error, does not throw
 *   in-app  → skips silently when io is not injected
 */
export class AlarmNotificationService {
  private io?: SocketIoServer;
  private logger?: Logger;

  setIo(io: SocketIoServer): void {
    this.io = io;
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Called from AlarmService.createInstance() — fire-and-forget, never throws.
   * Dispatches to all active in-app channels for the org.
   */
  async notifyOnCreate(orgId: string, alarm: IAlarmInstance): Promise<void> {
    try {
      const orgIdObj = new mongoose.Types.ObjectId(orgId);
      const channels = await NotificationChannel.find({
        orgId: orgIdObj,
        type: 'in-app',
        isActive: true,
      }).lean();

      for (const channel of channels) {
        this.sendToChannel(channel as unknown as INotificationChannel, alarm).catch((err) =>
          this.logger?.error({ err, channelId: channel._id }, 'notifyOnCreate dispatch failed')
        );
      }
    } catch (err) {
      this.logger?.error({ err }, 'AlarmNotificationService.notifyOnCreate error');
    }
  }

  /**
   * Dispatch alarm notification to a single channel.
   * Never throws — errors are logged.
   */
  async sendToChannel(
    channel: INotificationChannel,
    alarm: IAlarmInstance
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this._sendEmail(channel, alarm);
          break;
        case 'webhook':
          await this._sendWebhook(channel, alarm);
          break;
        case 'in-app':
          await this._sendInApp(channel.orgId.toString(), alarm);
          break;
      }
    } catch (err) {
      this.logger?.error(
        { err, channelId: channel._id, channelType: channel.type },
        'AlarmNotificationService.sendToChannel error'
      );
    }
  }

  // ─── Email ───────────────────────────────────────────────────────────────────

  private async _sendEmail(
    channel: INotificationChannel,
    alarm: IAlarmInstance
  ): Promise<void> {
    if (!config.smtp.host) {
      this.logger?.debug({ channelId: channel._id }, 'Email channel skipped — SMTP_HOST not configured');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
    });

    const to = (channel.config as { to?: string }).to;
    if (!to) {
      this.logger?.warn({ channelId: channel._id }, 'Email channel missing "to" address');
      return;
    }

    await transporter.sendMail({
      from: config.smtp.from || config.smtp.user || 'noreply@iot-platform.local',
      to,
      subject: `[${alarm.priority}] Alarm: ${alarm.tagName} — ${alarm.deviceId}`,
      text: [
        `Alarm: ${alarm.tagName}`,
        `Priority: ${alarm.priority}`,
        `Device: ${alarm.deviceId}`,
        `Field: ${alarm.field}`,
        `Value: ${alarm.triggerValue}`,
        `State: ${alarm.state}`,
        `Time: ${alarm.activeTimestamp.toISOString()}`,
      ].join('\n'),
    });

    this.logger?.info(
      { channelId: channel._id, to, tagName: alarm.tagName },
      'Alarm email sent'
    );
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  private async _sendWebhook(
    channel: INotificationChannel,
    alarm: IAlarmInstance
  ): Promise<void> {
    const cfg = channel.config as { url?: string; headers?: Record<string, string> };
    if (!cfg.url) {
      this.logger?.warn({ channelId: channel._id }, 'Webhook channel missing url');
      return;
    }

    // URL validation — http/https only
    const url = cfg.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.logger?.warn({ channelId: channel._id, url }, 'Webhook url must be http/https');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(cfg.headers ?? {}),
        },
        body: JSON.stringify({
          event: 'alarm.triggered',
          alarm: {
            id: alarm._id,
            tagName: alarm.tagName,
            deviceId: alarm.deviceId,
            field: alarm.field,
            triggerValue: alarm.triggerValue,
            priority: alarm.priority,
            state: alarm.state,
            activeTimestamp: alarm.activeTimestamp,
          },
        }),
      });

      if (!res.ok) {
        this.logger?.warn(
          { channelId: channel._id, url, status: res.status },
          'Webhook returned non-2xx response'
        );
      } else {
        this.logger?.info(
          { channelId: channel._id, url, status: res.status },
          'Alarm webhook dispatched'
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── In-App ──────────────────────────────────────────────────────────────────

  private async _sendInApp(orgId: string, alarm: IAlarmInstance): Promise<void> {
    if (!this.io) {
      this.logger?.debug('In-app channel skipped — Socket.io not injected');
      return;
    }

    const notification = await notificationService.create(orgId, {
      title: `[${alarm.priority}] ${alarm.tagName}`,
      message: `Device ${alarm.deviceId} — field ${alarm.field} = ${alarm.triggerValue}`,
      severity: alarm.priority === 'CRITICAL' || alarm.priority === 'HIGH' ? 'CRITICAL'
              : alarm.priority === 'MEDIUM' ? 'WARNING'
              : 'INFO',
      source: 'system',
    });

    this.io.emit('notification:new', { notification });

    this.logger?.info(
      { orgId, tagName: alarm.tagName, notificationId: notification.notificationId },
      'In-app alarm notification sent'
    );
  }
}

export const alarmNotificationService = new AlarmNotificationService();
