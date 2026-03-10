import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { Logger } from 'pino';
import mongoose from 'mongoose';
import { Device } from '../models/device.model';
import { AlarmRule, AlarmInstance } from '../models';
import type { WorkflowTriggerDispatcher } from './workflow-trigger-dispatcher.service';

/**
 * HeartbeatService (ADR-041)
 *
 * Background daemon that polls for devices that have stopped sending data.
 * - Runs every 60 seconds via node-cron
 * - Marks device as offline if lastSeenAt < now - OFFLINE_THRESHOLD_MS (default 5 min)
 * - Also considers devices with null lastSeenAt that were created > threshold ago
 * - On detection: raises ISA-18.2 alarm + dispatches trigger:deviceOffline workflows
 */
export class HeartbeatService {
  private task?: ScheduledTask;
  private dispatcher?: WorkflowTriggerDispatcher;
  private logger?: Logger;
  private readonly thresholdMs: number;

  constructor() {
    this.thresholdMs = parseInt(process.env.OFFLINE_THRESHOLD_MS ?? '300000', 10);
  }

  /**
   * Inject trigger dispatcher (avoids circular deps — same pattern as modbus/opcua managers)
   */
  setTriggerDispatcher(dispatcher: WorkflowTriggerDispatcher, logger: Logger): void {
    this.dispatcher = dispatcher;
    this.logger = logger;
  }

  /**
   * Start the 60-second polling cron job.
   */
  start(logger: Logger): void {
    if (!this.logger) this.logger = logger;

    this.task = cron.schedule('*/60 * * * * *', () => {
      this._checkOfflineDevices().catch(err => {
        this.logger?.error({ err }, 'HeartbeatService poll error');
      });
    });

    this.logger.info({ thresholdMs: this.thresholdMs }, 'HeartbeatService started');
  }

  /**
   * Stop the cron job on graceful shutdown.
   */
  stop(): void {
    this.task?.stop();
    this.logger?.info('HeartbeatService stopped');
  }

  /**
   * Check for devices that haven't been seen within the offline threshold.
   * Runs fire-and-forget from the cron tick.
   */
  async _checkOfflineDevices(): Promise<void> {
    const threshold = new Date(Date.now() - this.thresholdMs);

    // Find devices where lastSeenAt is stale OR device was created before threshold and has never sent data
    const staleDevices = await Device.find({
      $or: [
        { lastSeenAt: { $lt: threshold } },
        { lastSeenAt: null, createdAt: { $lt: threshold } },
      ],
    }).lean();

    if (staleDevices.length === 0) return;

    this.logger?.debug({ count: staleDevices.length }, 'HeartbeatService: stale devices detected');

    for (const device of staleDevices) {
      const orgId = device.orgId.toString();
      const { deviceId } = device;
      const offlineSinceMs = device.lastSeenAt
        ? Date.now() - device.lastSeenAt.getTime()
        : Date.now() - device.createdAt.getTime();

      // Raise ISA-18.2 alarm (idempotent — skip if already active)
      await this._raiseOfflineAlarm(orgId, deviceId, offlineSinceMs);

      // Dispatch trigger:deviceOffline workflows (fire-and-forget)
      if (this.dispatcher) {
        this.dispatcher
          .dispatchDeviceOffline(orgId, deviceId, offlineSinceMs)
          .catch(err => this.logger?.error({ err, deviceId }, 'dispatchDeviceOffline failed'));
      }
    }
  }

  /**
   * Create an ACTIVE_UNACKED alarm for device offline.
   * Idempotent: skips if an active offline alarm already exists.
   */
  private async _raiseOfflineAlarm(orgId: string, deviceId: string, offlineSinceMs: number): Promise<void> {
    try {
      // Check for existing active offline alarm
      const existing = await AlarmInstance.findOne({
        deviceId,
        tagName: 'device_offline',
        state: { $in: ['ACTIVE_UNACKED', 'ACTIVE_ACKED'] },
      }).lean();

      if (existing) return; // Already alarming — do not duplicate

      // Find or create offline alarm rule
      const existingRule = await AlarmRule.findOne({
        orgId: new mongoose.Types.ObjectId(orgId),
        tagName: 'device_offline',
      }).lean();

      let ruleId: any;
      if (existingRule) {
        ruleId = existingRule._id;
      } else {
        const newRule = await AlarmRule.create({
          orgId: new mongoose.Types.ObjectId(orgId),
          tagName: 'device_offline',
          name: 'Device Offline',
          description: 'Raised when a device stops transmitting data',
          deviceId,
          field: 'lastSeenAt',
          conditionType: 'THRESHOLD',
          operator: 'GREATER_THAN',
          parameters: { threshold: this.thresholdMs },
          priority: 'HIGH',
          isActive: true,
          isEnabled: true,
          isShelved: false,
          requiresAcknowledgment: true,
          deviceTags: [],
        });
        ruleId = newRule._id;
      }

      const now = new Date();
      await AlarmInstance.create({
        alarmRuleId: ruleId,
        tagName: 'device_offline',
        deviceId,
        field: 'lastSeenAt',
        triggerValue: offlineSinceMs,
        triggerTimestamp: now,
        triggerStateId: 'heartbeat',
        state: 'ACTIVE_UNACKED',
        priority: 'HIGH',
        requiresAcknowledgment: true,
        activeTimestamp: now,
        stateTransitions: [{ fromState: null, toState: 'ACTIVE_UNACKED', timestamp: now }],
      });

      this.logger?.warn({ deviceId, offlineSinceMs }, 'Device offline alarm raised');
    } catch (err) {
      this.logger?.error({ err, deviceId }, 'Failed to raise device offline alarm');
    }
  }
}

export const heartbeatService = new HeartbeatService();
