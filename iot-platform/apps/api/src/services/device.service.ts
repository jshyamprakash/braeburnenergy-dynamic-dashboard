import { ulid } from 'ulid';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
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
   *
   * @param orgId - Organization ID
   * @param data - Device creation data
   * @returns Created device with ULID
   *
   * @example
   * const device = await deviceService.create("org-uuid", {
   *   name: "Temperature Sensor",
   *   tags: ["warehouse", "floor-1"],
   *   attributes: { location: "Zone A" }
   * });
   * // Returns device with deviceId: "01HGW5N8XZ7KQRST9VW2XY3Z4A"
   */
  async create(orgId: string, data: CreateDeviceDTO) {
    const deviceId = ulid(); // Generate time-sortable ULID

    const createData: any = {
      orgId,
      deviceId,
      name: data.name,
      tags: data.tags || [],
    };

    // Only include attributes if provided
    if (data.attributes) {
      createData.attributes = data.attributes;
    }

    return prisma.device.create({
      data: createData,
    });
  }

  /**
   * Get device by ULID within organization
   *
   * @param orgId - Organization ID
   * @param deviceId - Device ULID
   * @param includeStates - Include recent states (default: false)
   * @returns Device or null if not found
   */
  async getByDeviceId(orgId: string, deviceId: string, includeStates = false) {
    return prisma.device.findUnique({
      where: {
        orgId_deviceId: {
          orgId,
          deviceId,
        },
      },
      include: includeStates
        ? {
            states: {
              orderBy: { timestamp: 'desc' },
              take: 10, // Last 10 states
            },
          }
        : undefined,
    });
  }

  /**
   * Get device by internal UUID (rarely used externally)
   *
   * @param id - Internal UUID
   * @returns Device or null
   */
  async getById(id: string) {
    return prisma.device.findUnique({
      where: { id },
    });
  }

  /**
   * Update device within organization
   *
   * @param orgId - Organization ID
   * @param deviceId - Device ULID
   * @param data - Update data (partial)
   * @returns Updated device or null if not found
   */
  async update(orgId: string, deviceId: string, data: UpdateDeviceDTO) {
    try {
      const updateData: any = {};

      // Only include fields that are provided
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.tags !== undefined) {
        updateData.tags = data.tags;
      }
      if (data.attributes !== undefined) {
        updateData.attributes = data.attributes;
      }

      return await prisma.device.update({
        where: {
          orgId_deviceId: {
            orgId,
            deviceId,
          },
        },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record not found
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * Delete device within organization
   *
   * @param orgId - Organization ID
   * @param deviceId - Device ULID
   * @returns Deleted device or null if not found
   */
  async delete(orgId: string, deviceId: string) {
    try {
      return await prisma.device.delete({
        where: {
          orgId_deviceId: {
            orgId,
            deviceId,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record not found
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * List devices with filtering, search, and pagination within organization
   *
   * @param orgId - Organization ID
   * @param query - Query parameters
   * @returns Paginated device list
   */
  async list(orgId: string, query: QueryDevicesDTO) {
    const { limit = 100, offset = 0, tags, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    // Build where clause with org_id filter
    const where: Prisma.DeviceWhereInput = {
      orgId, // Filter by organization
    };

    // Tag filtering (array contains)
    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags, // Device must have ALL specified tags (AND logic)
      };
    }

    // Search by name (case-insensitive)
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Execute query with count
    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      prisma.device.count({ where }),
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
   *
   * @param orgId - Organization ID
   * @param tags - Tags to search for
   * @param limit - Result limit
   * @returns Devices matching any tag
   */
  async searchByTags(orgId: string, tags: string[], limit = 100) {
    return prisma.device.findMany({
      where: {
        orgId,
        tags: {
          hasSome: tags, // Has ANY of these tags (OR logic)
        },
      },
      orderBy: { deviceId: 'desc' }, // Newest first (ULID is time-sortable)
      take: limit,
    });
  }

  /**
   * Get devices by exact tag set within organization
   *
   * @param orgId - Organization ID
   * @param tags - Exact tags array
   * @returns Devices with exactly these tags
   */
  async getByExactTags(orgId: string, tags: string[]) {
    return prisma.device.findMany({
      where: {
        orgId,
        tags: {
          equals: tags,
        },
      },
    });
  }

  /**
   * Get device count within organization
   *
   * @param orgId - Organization ID
   * @param tags - Optional tag filter
   * @returns Total device count
   */
  async count(orgId: string, tags?: string[]) {
    const where: Prisma.DeviceWhereInput = {
      orgId,
    };

    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags,
      };
    }

    return prisma.device.count({ where });
  }

  /**
   * Check if device exists within organization
   *
   * @param orgId - Organization ID
   * @param deviceId - Device ULID
   * @returns True if device exists
   */
  async exists(orgId: string, deviceId: string): Promise<boolean> {
    const count = await prisma.device.count({
      where: {
        orgId_deviceId: {
          orgId,
          deviceId,
        },
      },
    });
    return count > 0;
  }

  /**
   * Bulk create devices within organization
   *
   * @param orgId - Organization ID
   * @param devices - Array of device data
   * @returns Created devices
   */
  async bulkCreate(orgId: string, devices: CreateDeviceDTO[]) {
    const data = devices.map((device) => {
      const record: any = {
        orgId,
        deviceId: ulid(), // Generate ULID for each device
        name: device.name,
        tags: device.tags || [],
      };

      // Only include attributes if provided (avoid type issues with JSON)
      if (device.attributes) {
        record.attributes = device.attributes;
      }

      return record;
    });

    return prisma.device.createMany({
      data,
      skipDuplicates: true, // Skip if composite key already exists
    });
  }

  /**
   * Get recently created devices within organization (uses ULID time-sorting)
   *
   * @param orgId - Organization ID
   * @param limit - Number of devices to return
   * @returns Recently created devices (newest first)
   */
  async getRecent(orgId: string, limit = 50) {
    return prisma.device.findMany({
      where: { orgId },
      orderBy: { deviceId: 'desc' }, // ULID is time-sortable!
      take: limit,
    });
  }

  /**
   * Get devices created in time range within organization (uses ULID timestamp)
   *
   * @param orgId - Organization ID
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Devices created in range
   */
  async getByTimeRange(orgId: string, startTime: Date, endTime: Date) {
    // Generate ULID boundaries from timestamps
    const startUlid = ulid(startTime.getTime());
    const endUlid = ulid(endTime.getTime());

    return prisma.device.findMany({
      where: {
        orgId,
        deviceId: {
          gte: startUlid,
          lte: endUlid,
        },
      },
      orderBy: { deviceId: 'asc' },
    });
  }
}

// Export singleton instance
export const deviceService = new DeviceService();
