import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type {
  CreateDeviceStateDTO,
  BulkCreateDeviceStatesDTO,
  QueryDeviceStatesDTO,
  AggregateDeviceStatesDTO,
  TimeBucket,
  AggregationFunction,
} from '../schemas/device-state.schema';

/**
 * DeviceStateService
 *
 * Handles all business logic for device state/telemetry management
 * - Time-series data ingestion
 * - Time-range queries
 * - Aggregation and downsampling (using TimescaleDB)
 * - Bulk operations
 */
export class DeviceStateService {
  /**
   * Create a new device state
   *
   * @param data - State creation data
   * @returns Created device state
   *
   * @example
   * const state = await deviceStateService.create({
   *   deviceId: "01HGW5N8XZ7KQRST9VW2XY3Z4A",
   *   data: { temperature: 23.5, humidity: 45 },
   *   timestamp: new Date()
   * });
   */
  async create(data: CreateDeviceStateDTO) {
    return prisma.deviceState.create({
      data: {
        deviceId: data.deviceId,
        data: data.data as any,
        timestamp: data.timestamp || new Date(),
      },
    });
  }

  /**
   * Bulk create device states (batch ingestion)
   *
   * @param data - Bulk creation data
   * @returns Count of created states
   *
   * @example
   * const result = await deviceStateService.bulkCreate({
   *   states: [
   *     { deviceId: "01HGW...", data: { temp: 23.5 } },
   *     { deviceId: "01HGW...", data: { temp: 24.1 } },
   *   ]
   * });
   */
  async bulkCreate(data: BulkCreateDeviceStatesDTO) {
    const states = data.states.map((state) => ({
      deviceId: state.deviceId,
      data: state.data as any,
      timestamp: state.timestamp || new Date(),
    }));

    return prisma.deviceState.createMany({
      data: states,
    });
  }

  /**
   * Get device states with time-range filtering
   *
   * @param deviceId - Device ULID
   * @param query - Query parameters (time range, pagination, sorting)
   * @returns Paginated device states
   */
  async getStates(deviceId: string, query: QueryDeviceStatesDTO) {
    const { startTime, endTime, limit = 1000, offset = 0, sortOrder = 'desc' } = query;

    // Build where clause
    const where: Prisma.DeviceStateWhereInput = {
      deviceId,
    };

    // Time range filter
    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) {
        where.timestamp.gte = startTime;
      }
      if (endTime) {
        where.timestamp.lte = endTime;
      }
    }

    // Execute query with count
    const [states, total] = await Promise.all([
      prisma.deviceState.findMany({
        where,
        orderBy: { timestamp: sortOrder },
        take: limit,
        skip: offset,
        select: {
          id: true,
          deviceId: true,
          data: true,
          timestamp: true,
        },
      }),
      prisma.deviceState.count({ where }),
    ]);

    return {
      data: states,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get latest state for a device
   *
   * @param deviceId - Device ULID
   * @returns Latest state or null
   */
  async getLatest(deviceId: string) {
    return prisma.deviceState.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        deviceId: true,
        data: true,
        timestamp: true,
      },
    });
  }

  /**
   * Get oldest state for a device
   *
   * @param deviceId - Device ULID
   * @returns Oldest state or null
   */
  async getOldest(deviceId: string) {
    return prisma.deviceState.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        deviceId: true,
        data: true,
        timestamp: true,
      },
    });
  }

  /**
   * Get state count for a device
   *
   * @param deviceId - Device ULID
   * @param startTime - Optional start time
   * @param endTime - Optional end time
   * @returns State count
   */
  async count(deviceId: string, startTime?: Date, endTime?: Date): Promise<number> {
    const where: Prisma.DeviceStateWhereInput = {
      deviceId,
    };

    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) {
        where.timestamp.gte = startTime;
      }
      if (endTime) {
        where.timestamp.lte = endTime;
      }
    }

    return prisma.deviceState.count({ where });
  }

  /**
   * Delete old states (cleanup)
   *
   * @param deviceId - Device ULID
   * @param beforeDate - Delete states older than this date
   * @returns Number of deleted states
   */
  async deleteOldStates(deviceId: string, beforeDate: Date) {
    const result = await prisma.deviceState.deleteMany({
      where: {
        deviceId,
        timestamp: {
          lt: beforeDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Aggregate device states using TimescaleDB time_bucket
   *
   * This uses raw SQL to leverage TimescaleDB's time_bucket function
   * for efficient downsampling of time-series data.
   *
   * @param deviceId - Device ULID
   * @param data - Aggregation parameters
   * @returns Aggregated data points
   *
   * @example
   * const aggregated = await deviceStateService.aggregate("01HGW...", {
   *   startTime: new Date("2026-02-01"),
   *   endTime: new Date("2026-02-05"),
   *   bucket: "1h",
   *   fields: ["temperature", "humidity"],
   *   functions: ["avg", "min", "max"]
   * });
   */
  async aggregate(deviceId: string, data: AggregateDeviceStatesDTO) {
    const { startTime, endTime, bucket, fields, functions } = data;

    // Convert bucket to PostgreSQL interval
    const interval = this.getBucketInterval(bucket);

    // Build SELECT clause for each field and function combination
    const aggregations = fields.flatMap((field) =>
      functions.map((func) => {
        const sqlFunc = this.getAggregationSQL(func, field);
        return `${sqlFunc} as "${field}_${func}"`;
      })
    );

    // Raw SQL query using TimescaleDB time_bucket
    const query = `
      SELECT
        time_bucket('${interval}', timestamp) AS bucket,
        ${aggregations.join(',\n        ')}
      FROM device_states
      WHERE device_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(
      query,
      deviceId,
      startTime,
      endTime
    );

    return {
      deviceId,
      startTime,
      endTime,
      bucket,
      data: result.map((row) => ({
        bucket: row.bucket,
        values: Object.entries(row)
          .filter(([key]) => key !== 'bucket')
          .reduce((acc, [key, value]) => {
            acc[key] = value as number;
            return acc;
          }, {} as Record<string, number>),
      })),
    };
  }

  /**
   * Get simple statistics for a field
   *
   * @param deviceId - Device ULID
   * @param field - Data field name (e.g., "temperature")
   * @param startTime - Start time
   * @param endTime - End time
   * @returns Statistics (avg, min, max, count)
   */
  async getStatistics(
    deviceId: string,
    field: string,
    startTime: Date,
    endTime: Date
  ) {
    const query = `
      SELECT
        AVG((data->>'${field}')::numeric) as avg,
        MIN((data->>'${field}')::numeric) as min,
        MAX((data->>'${field}')::numeric) as max,
        COUNT(*) as count
      FROM device_states
      WHERE device_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
        AND data ? '${field}'
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(
      query,
      deviceId,
      startTime,
      endTime
    );

    const stats = result[0] || { avg: null, min: null, max: null, count: 0 };

    // Convert BigInt to Number for JSON serialization
    return {
      avg: stats.avg ? Number(stats.avg) : null,
      min: stats.min ? Number(stats.min) : null,
      max: stats.max ? Number(stats.max) : null,
      count: Number(stats.count),
    };
  }

  /**
   * Get states for multiple devices (batch query)
   *
   * @param deviceIds - Array of device ULIDs
   * @param startTime - Start time
   * @param endTime - End time
   * @param limit - Limit per device
   * @returns States grouped by device
   */
  async getStatesForDevices(
    deviceIds: string[],
    startTime?: Date,
    endTime?: Date,
    limit = 100
  ) {
    const where: Prisma.DeviceStateWhereInput = {
      deviceId: {
        in: deviceIds,
      },
    };

    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) {
        where.timestamp.gte = startTime;
      }
      if (endTime) {
        where.timestamp.lte = endTime;
      }
    }

    const states = await prisma.deviceState.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit * deviceIds.length,
      select: {
        id: true,
        deviceId: true,
        data: true,
        timestamp: true,
      },
    });

    // Group by deviceId
    return deviceIds.map((deviceId) => ({
      deviceId,
      states: states.filter((s) => s.deviceId === deviceId).slice(0, limit),
    }));
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Convert TimeBucket enum to PostgreSQL interval
   */
  private getBucketInterval(bucket: TimeBucket): string {
    const intervals: Record<TimeBucket, string> = {
      '1m': '1 minute',
      '5m': '5 minutes',
      '15m': '15 minutes',
      '1h': '1 hour',
      '6h': '6 hours',
      '1d': '1 day',
      '1w': '1 week',
    };
    return intervals[bucket];
  }

  /**
   * Generate SQL aggregation function
   */
  private getAggregationSQL(func: AggregationFunction, field: string): string {
    const jsonbPath = `(data->>'${field}')::numeric`;

    switch (func) {
      case 'avg':
        return `AVG(${jsonbPath})`;
      case 'min':
        return `MIN(${jsonbPath})`;
      case 'max':
        return `MAX(${jsonbPath})`;
      case 'sum':
        return `SUM(${jsonbPath})`;
      case 'count':
        return `COUNT(${jsonbPath})`;
      case 'first':
        return `FIRST(${jsonbPath}, timestamp)`;
      case 'last':
        return `LAST(${jsonbPath}, timestamp)`;
      default:
        throw new Error(`Unsupported aggregation function: ${func}`);
    }
  }
}

// Export singleton instance
export const deviceStateService = new DeviceStateService();
