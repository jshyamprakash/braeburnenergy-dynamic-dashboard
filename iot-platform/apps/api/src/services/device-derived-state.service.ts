import mongoose from 'mongoose';
import { DeviceDerivedState } from '../models/device-derived-state.model';

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

    await DeviceDerivedState.findOneAndUpdate(
      { deviceId },
      { $set: setFields },
      { upsert: true, new: true }
    );
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
    }));
  }
}

export const deviceDerivedStateService = new DeviceDerivedStateService();
