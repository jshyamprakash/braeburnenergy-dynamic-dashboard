import { ulid } from 'ulid';
import mongoose from 'mongoose';
import { Device } from '../models/device.model';
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
    const deviceId = ulid();

    const device = new Device({
      orgId: new mongoose.Types.ObjectId(orgId),
      deviceId,
      name: data.name,
      tags: data.tags || [],
      attributes: data.attributes || null,
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

    if (!device || !includeStates) return device;

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

    return { ...device, states: transformedStates };
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
   */
  async delete(orgId: string, deviceId: string) {
    const device = await Device.findOneAndDelete({
      orgId: new mongoose.Types.ObjectId(orgId),
      deviceId,
    }).lean();

    return device;
  }

  /**
   * List devices with filtering, search, and pagination within organization
   */
  async list(orgId: string, query: QueryDevicesDTO) {
    const { limit = 100, offset = 0, tags, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter: any = {
      orgId: new mongoose.Types.ObjectId(orgId),
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
  async searchByTags(orgId: string, tags: string[], limit = 100) {
    return Device.find({
      orgId: new mongoose.Types.ObjectId(orgId),
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
  async count(orgId: string, tags?: string[]) {
    const filter: any = {
      orgId: new mongoose.Types.ObjectId(orgId),
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
      tags: device.tags || [],
      attributes: device.attributes || null,
    }));

    const result = await Device.insertMany(docs, { ordered: false });
    return { count: result.length };
  }

  /**
   * Get recently created devices within organization (uses ULID time-sorting)
   */
  async getRecent(orgId: string, limit = 50) {
    return Device.find({ orgId: new mongoose.Types.ObjectId(orgId) })
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
