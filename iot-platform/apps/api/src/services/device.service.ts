import { ulid } from 'ulid';
import mongoose from 'mongoose';
import { Device } from '../models/device.model';
import { UnprocessableError, ConflictError, BadRequestError } from '../lib/errors';
import type {
  CreateDeviceDTO,
  UpdateDeviceDTO,
  QueryDevicesDTO,
} from '../schemas/device.schema';

/**
 * DeviceService
 *
 * Handles all business logic for device management
 * - CRUD operations with ULID generation
 * - Filtering, pagination, search
 * - Tag-based queries
 */
export class DeviceService {
  /**
   * Create a new device with system-generated ULID
   */
  async create(orgId: string, data: CreateDeviceDTO) {
    // Enforce ADR-036: Device must belong to an application
    if (!data.applicationId) {
      throw new UnprocessableError('Device requires an application — create devices from the Application Detail page');
    }

    const deviceId = ulid();

    const device = new Device({
      orgId: new mongoose.Types.ObjectId(orgId),
      deviceId,
      name: data.name,
      tags: data.tags || [],
      attributes: data.attributes || null,
      dataSource: data.dataSource ?? 'gateway', // ADR-046
      applicationId: data.applicationId,
    });

    const saved = await device.save();
    return saved.toObject();
  }

  /**
   * Get device by ULID within organization
   */
  async getByDeviceId(orgId: string, deviceId: string, includeStates = false): Promise<any> {
    const device = await Device.findOne({
      orgId: new mongoose.Types.ObjectId(orgId),
      deviceId,
    }).lean();

    if (!device) return device;

    // Always fetch last-known derived state so dashboard gauges survive workflow deletion.
    const { DeviceDerivedState } = await import('../models/device-derived-state.model');
    const derivedDoc = await DeviceDerivedState.findOne({ deviceId }).lean() as any;
    const derivedState = derivedDoc?.derived ?? {};
    const derivedStateMeta = {
      stale: derivedDoc?.stale ?? false,
      staledAt: derivedDoc?.staledAt ?? null,
    };

    if (!includeStates) return { ...device, derivedState, derivedStateMeta };

    // If includeStates, fetch recent states
    const { DeviceState } = await import('../models/device-state.model');
    const states = await DeviceState.find({ 'metadata.deviceId': deviceId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Transform states to flat format for API compatibility
    const transformedStates = states.map((s: any) => ({
      id: s._id,
      deviceId: s.metadata.deviceId,
      data: s.data,
      timestamp: s.timestamp,
    }));

    return { ...device, states: transformedStates, derivedState, derivedStateMeta };
  }

  /**
   * Get device by internal ID
   */
  async getById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Device.findById(id).lean();
  }

  /**
   * Update device within organization
   */
  async update(orgId: string, deviceId: string, data: UpdateDeviceDTO) {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.attributes !== undefined) updateData.attributes = data.attributes;
    if (data.dataSource !== undefined) updateData.dataSource = data.dataSource; // ADR-046

    const device = await Device.findOneAndUpdate(
      {
        orgId: new mongoose.Types.ObjectId(orgId),
        deviceId,
      },
      { $set: updateData },
      { new: true }
    ).lean();

    return device;
  }

  /**
   * Delete device within organization
   * Guards: block if active AlarmRules or AlarmInstances exist
   * Cascade: auto-delete DeviceState records
   */
  async delete(orgId: string, deviceId: string) {
    const { AlarmRule } = await import('../models/alarm-rule.model');
    const { AlarmInstance } = await import('../models/alarm-instance.model');
    const { DeviceState } = await import('../models/device-state.model');

    const [alarmRuleCount, alarmInstanceCount] = await Promise.all([
      AlarmRule.countDocuments({ deviceId, isActive: true }),
      AlarmInstance.countDocuments({ deviceId, state: { $in: ['ACTIVE_UNACKED', 'ACTIVE_ACKED'] } }),
    ]);

    const blocking: Record<string, number> = {};
    if (alarmRuleCount > 0) blocking.alarmRules = alarmRuleCount;
    if (alarmInstanceCount > 0) blocking.alarmInstances = alarmInstanceCount;

    if (Object.keys(blocking).length > 0) {
      throw new ConflictError('Cannot delete device: resolve active alarms first.', { blocking });
    }

    const device = await Device.findOneAndDelete({
      orgId: new mongoose.Types.ObjectId(orgId),
      deviceId,
    }).lean();

    if (device) {
      await DeviceState.deleteMany({ 'metadata.deviceId': deviceId });
    }

    return device;
  }

  /**
   * List devices with filtering, search, and pagination within organization
   */
  async list(orgId: string, query: QueryDevicesDTO) {
    const { limit = 100, offset = 0, tags, search, sortBy = 'createdAt', sortOrder = 'desc', applicationId } = query;

    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }

    const filter: any = {
      orgId: new mongoose.Types.ObjectId(orgId),
      applicationId,
    };

    // Tag filtering (device must have ALL specified tags)
    if (tags && tags.length > 0) {
      filter.tags = { $all: tags };
    }

    // Search by name (case-insensitive)
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [devices, total] = await Promise.all([
      Device.find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(offset)
        .limit(limit)
        .lean(),
      Device.countDocuments(filter),
    ]);

    return {
      data: devices,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Search devices by tags (has ANY of the specified tags) within organization
   */
  async searchByTags(orgId: string, applicationId: string, tags: string[], limit = 100) {
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }
    return Device.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      applicationId,
      tags: { $in: tags },
    })
      .sort({ deviceId: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get devices by exact tag set within organization
   */
  async getByExactTags(orgId: string, tags: string[]) {
    return Device.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      tags: { $eq: tags },
    }).lean();
  }

  /**
   * Get device count within organization
   */
  async count(orgId: string, applicationId: string, tags?: string[]) {
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }
    const filter: any = {
      orgId: new mongoose.Types.ObjectId(orgId),
      applicationId,
    };

    if (tags && tags.length > 0) {
      filter.tags = { $all: tags };
    }

    return Device.countDocuments(filter);
  }

  /**
   * Check if device exists within organization
   */
  async exists(orgId: string, deviceId: string): Promise<boolean> {
    const count = await Device.countDocuments({
      orgId: new mongoose.Types.ObjectId(orgId),
      deviceId,
    });
    return count > 0;
  }

  /**
   * Bulk create devices within organization
   */
  async bulkCreate(orgId: string, devices: CreateDeviceDTO[]) {
    const docs = devices.map((device) => ({
      orgId: new mongoose.Types.ObjectId(orgId),
      deviceId: ulid(),
      name: device.name,
      tags: device.tags || {},
      attributes: device.attributes || null,
    }));

    const result = await Device.insertMany(docs, { ordered: false });
    return { count: result.length };
  }

  /**
   * Get recently created devices within organization (uses ULID time-sorting)
   */
  async getRecent(orgId: string, applicationId: string, limit = 50) {
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }
    return Device.find({ orgId: new mongoose.Types.ObjectId(orgId), applicationId })
      .sort({ deviceId: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get devices created in time range within organization (uses ULID timestamp)
   */
  async getByTimeRange(orgId: string, startTime: Date, endTime: Date) {
    const startUlid = ulid(startTime.getTime());
    const endUlid = ulid(endTime.getTime());

    return Device.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      deviceId: { $gte: startUlid, $lte: endUlid },
    })
      .sort({ deviceId: 1 })
      .lean();
  }
}

// Export singleton instance
export const deviceService = new DeviceService();
