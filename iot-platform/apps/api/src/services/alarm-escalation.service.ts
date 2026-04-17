import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { Logger } from 'pino';
import mongoose from 'mongoose';
import { AlarmInstance } from '../models/alarm-instance.model';
import { EscalationPolicy } from '../models/escalation-policy.model';
import { NotificationChannel } from '../models/notification-channel.model';
import type { AlarmNotificationService } from './alarm-notification.service';
import { DEFAULT_ORG_ID } from '../lib/request-context';

/**
 * AlarmEscalationService (ADR-059)
 *
 * Background daemon that polls for ACTIVE_UNACKED alarms and fires escalation
 * notifications when alarms age past configured tier thresholds.
 *
 * Pattern: node-cron singleton, 60s poll (same as HeartbeatService ADR-041).
 * Idempotent: escalatedTiers[] on AlarmInstance prevents duplicate dispatch.
 *
 * Policy resolution order:
 *   1. Exact match: orgId + alarmRuleId
 *   2. Org wildcard: orgId + no alarmRuleId
 *   (First exact match wins; wildcard applies only when no exact match found)
 */
export class AlarmEscalationService {
  private task?: ScheduledTask;
  private notificationService?: AlarmNotificationService;
  private logger?: Logger;

  setNotificationService(svc: AlarmNotificationService): void {
    this.notificationService = svc;
  }

  start(logger: Logger): void {
    this.logger = logger;

    this.task = cron.schedule('*/60 * * * * *', () => {
      this._runEscalationPoll().catch((err) => {
        this.logger?.error({ err }, 'AlarmEscalationService poll error');
      });
    });

    this.logger.info('AlarmEscalationService started');
  }

  stop(): void {
    this.task?.stop();
    this.logger?.info('AlarmEscalationService stopped');
  }

  /**
   * Main poll — called every 60s.
   * Finds all ACTIVE_UNACKED alarms, checks against escalation policies,
   * and dispatches any tiers that have not yet fired.
   */
  async _runEscalationPoll(): Promise<void> {
    if (!this.notificationService) return;

    // Find ACTIVE_UNACKED alarms — populate alarmRuleId to get orgId
    const alarms = await AlarmInstance.find({
      state: 'ACTIVE_UNACKED',
    })
      .populate<{ alarmRuleId: { _id: mongoose.Types.ObjectId; orgId?: mongoose.Types.ObjectId } }>('alarmRuleId', 'orgId')
      .lean();

    if (alarms.length === 0) return;

    this.logger?.debug({ count: alarms.length }, 'AlarmEscalationService: checking alarms');

    for (const alarm of alarms) {
      const rule = alarm.alarmRuleId as any;
      // AlarmRule has no orgId for alarms from evaluateDeviceState (POC constraint).
      // HeartbeatService-created rules DO have orgId. Fall back to DEFAULT_ORG_ID.
      const orgId: mongoose.Types.ObjectId = rule?.orgId
        ?? new mongoose.Types.ObjectId(DEFAULT_ORG_ID);
      const alarmRuleId = rule?._id as mongoose.Types.ObjectId | undefined;

      const policy = await this._findPolicy(orgId, alarmRuleId!);
      if (!policy || !policy.isActive) continue;

      const ageMinutes = (Date.now() - new Date(alarm.activeTimestamp).getTime()) / 60_000;
      const alreadyEscalated: number[] = (alarm as any).escalatedTiers ?? [];

      const SEVERITY_LEVELS: Record<string, number> = {
        CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1,
      };
      const alarmSeverityLevel = SEVERITY_LEVELS[alarm.priority] ?? 0;

      for (let i = 0; i < policy.tiers.length; i++) {
        const tier = policy.tiers[i];

        if (alreadyEscalated.includes(i)) continue; // Already fired
        if (ageMinutes < tier.delayMinutes) continue; // Not old enough yet

        const requiredLevel = SEVERITY_LEVELS[tier.minimumSeverity] ?? 0;
        if (alarmSeverityLevel < requiredLevel) continue; // Alarm severity below tier threshold

        // Dispatch all channels in this tier
        await this._dispatchTier(orgId.toString(), alarm as any, tier.channelIds, i);
      }
    }
  }

  /**
   * Find the best-matching EscalationPolicy for an alarm.
   * Prefers exact alarmRuleId match; falls back to org-wide wildcard.
   */
  private async _findPolicy(
    orgId: mongoose.Types.ObjectId,
    alarmRuleId: mongoose.Types.ObjectId
  ) {
    // Try exact match first
    const exact = await EscalationPolicy.findOne({
      orgId,
      alarmRuleId,
      isActive: true,
    }).lean();

    if (exact) return exact;

    // Fall back to org-wide policy (no alarmRuleId)
    return EscalationPolicy.findOne({
      orgId,
      alarmRuleId: { $exists: false },
      isActive: true,
    }).lean();
  }

  /**
   * Dispatch a single escalation tier.
   * Marks tier as dispatched atomically via $addToSet to prevent duplicates
   * in case of concurrent polls.
   */
  private async _dispatchTier(
    orgId: string,
    alarm: any,
    channelIds: mongoose.Types.ObjectId[],
    tierIndex: number
  ): Promise<void> {
    // Atomically mark tier dispatched — prevents double-fire on concurrent polls
    const updated = await AlarmInstance.findOneAndUpdate(
      { _id: alarm._id, escalatedTiers: { $ne: tierIndex } },
      { $addToSet: { escalatedTiers: tierIndex } },
      { new: false }
    );

    if (!updated) return; // Another poll already dispatched this tier

    this.logger?.info(
      { alarmId: alarm._id, tagName: alarm.tagName, tierIndex },
      'AlarmEscalationService: dispatching tier'
    );

    // Resolve channel documents and dispatch
    const channels = await NotificationChannel.find({
      _id: { $in: channelIds },
      orgId: new mongoose.Types.ObjectId(orgId),
      isActive: true,
    }).lean();

    for (const channel of channels) {
      this.notificationService!
        .sendToChannel(channel as any, alarm)
        .catch((err) =>
          this.logger?.error(
            { err, channelId: channel._id, tierIndex },
            'Escalation tier dispatch failed'
          )
        );
    }
  }
}

export const alarmEscalationService = new AlarmEscalationService();
