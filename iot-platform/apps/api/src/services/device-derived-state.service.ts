import mongoose from 'mongoose';
import { DeviceDerivedState } from '../models/device-derived-state.model';
import { DeviceDerivedStateHistory } from '../models/device-derived-state-history.model';

/**
 * DeviceDerivedStateService (ADR-031)
 *
 * Manages the device_derived_states collection.
 * One document per device — updated by workflow writeDeviceState actions.
 * Dashboard reads exclusively from this collection.
 */
export class DeviceDerivedStateService {
  /**
   * Upsert derived values for a device.
   * Uses per-key $set paths to avoid overwriting unrelated keys.
   */
  async upsert(
    deviceId: string,
    patch: Record<string, any>,
    sourceEventId?: string
  ): Promise<void> {
    const setFields: Record<string, any> = { lastSeen: new Date() };
    for (const [key, value] of Object.entries(patch)) {
      setFields[`derived.${key}`] = value;
    }

    if (sourceEventId && mongoose.Types.ObjectId.isValid(sourceEventId)) {
      setFields.sourceEventId = new mongoose.Types.ObjectId(sourceEventId);
    }

    // Reset stale flag when workflow writes fresh derived output (ADR-034)
    setFields.stale = false;
    setFields.staledAt = null;

    await DeviceDerivedState.findOneAndUpdate(
      { deviceId },
      { $set: setFields },
      { upsert: true, new: true }
    );

    // Append to history collection for N-point dashboard seeding
    await DeviceDerivedStateHistory.create({
      deviceId,
      derived: patch,
      timestamp: new Date(),
      sourceEventId:
        sourceEventId && mongoose.Types.ObjectId.isValid(sourceEventId)
          ? new mongoose.Types.ObjectId(sourceEventId)
          : undefined,
    });
  }

  /**
   * Get the N most recent history entries for a device (newest first).
   * Used to seed dashboard chart and live stream with N historical derived points.
   */
  async getHistory(deviceId: string, limit: number): Promise<Array<{ deviceId: string; derived: Record<string, any>; timestamp: Date }>> {
    const docs = await DeviceDerivedStateHistory
      .find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean() as any[];
    return docs.map((doc) => ({
      deviceId: doc.deviceId,
      derived: doc.derived ?? {},
      timestamp: doc.timestamp,
    }));
  }

  /**
   * Get the latest derived state for a device.
   */
  async getLatest(deviceId: string): Promise<Record<string, any> | null> {
    const doc = await DeviceDerivedState.findOne({ deviceId }).lean() as any;
    if (!doc) return null;
    return {
      deviceId: doc.deviceId,
      derived: doc.derived ?? {},
      lastSeen: doc.lastSeen,
      sourceEventId: doc.sourceEventId,
      stale: doc.stale ?? false,
      staledAt: doc.staledAt ?? null,
    };
  }

  /**
   * Get all derived states for devices in an organization.
   * orgId is used to filter by deviceIds belonging to that org.
   */
  async getAllForOrg(deviceIds: string[]): Promise<Record<string, any>[]> {
    const docs = await DeviceDerivedState.find({ deviceId: { $in: deviceIds } }).lean() as any[];
    return docs.map((doc) => ({
      deviceId: doc.deviceId,
      derived: doc.derived ?? {},
      lastSeen: doc.lastSeen,
      sourceEventId: doc.sourceEventId,
      stale: doc.stale ?? false,
      staledAt: doc.staledAt ?? null,
    }));
  }

  /**
   * Mark all derived states as stale.
   * Called when a workflow is deleted (ADR-034).
   */
  async markAllStale(): Promise<void> {
    await DeviceDerivedState.updateMany(
      {},
      { $set: { stale: true, staledAt: new Date() } }
    );
  }
}

export const deviceDerivedStateService = new DeviceDerivedStateService();
