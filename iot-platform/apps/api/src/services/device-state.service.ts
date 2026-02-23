import mongoose from 'mongoose';
import { DeviceState } from '../models/device-state.model';
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
 * - Aggregation and downsampling (using MongoDB aggregation pipeline)
 * - Bulk operations
 */
export class DeviceStateService {
  /**
   * Create a new device state
   */
  async create(orgId: string, data: CreateDeviceStateDTO & { quality?: any }) {
    const doc = new DeviceState({
      timestamp: data.timestamp || new Date(),
      metadata: {
        deviceId: data.deviceId,
        orgId: new mongoose.Types.ObjectId(orgId),
      },
      data: data.data,
      quality: data.quality,
    });

    const saved = await doc.save();
    const obj = saved.toObject();

    // Return flat format for API compatibility
    return {
      _id: obj._id,
      id: obj._id,
      deviceId: obj.metadata.deviceId,
      orgId: obj.metadata.orgId.toString(),
      data: obj.data,
      timestamp: obj.timestamp,
      quality: obj.quality,
    };
  }

  /**
   * Bulk create device states (batch ingestion)
   */
  async bulkCreate(orgId: string, data: BulkCreateDeviceStatesDTO) {
    const docs = data.states.map((state) => ({
      timestamp: state.timestamp || new Date(),
      metadata: {
        deviceId: state.deviceId,
        orgId: new mongoose.Types.ObjectId(orgId),
      },
      data: state.data,
    }));

    const result = await DeviceState.insertMany(docs);
    return { count: result.length };
  }

  /**
   * Get device states with time-range filtering within organization
   */
  async getStates(orgId: string, deviceId: string, query: QueryDeviceStatesDTO) {
    const { startTime, endTime, limit = 1000, offset = 0, sortOrder = 'desc' } = query;

    const filter: any = {
      'metadata.deviceId': deviceId,
      'metadata.orgId': new mongoose.Types.ObjectId(orgId),
    };

    if (startTime || endTime) {
      filter.timestamp = {};
      if (startTime) filter.timestamp.$gte = startTime;
      if (endTime) filter.timestamp.$lte = endTime;
    }

    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const [states, total] = await Promise.all([
      DeviceState.find(filter)
        .sort({ timestamp: sortDirection })
        .skip(offset)
        .limit(limit)
        .lean(),
      DeviceState.countDocuments(filter),
    ]);

    // Transform to flat format for API compatibility
    const data = states.map((s: any) => ({
      id: s._id,
      deviceId: s.metadata.deviceId,
      data: s.data,
      timestamp: s.timestamp,
    }));

    return {
      data,
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
   */
  async getLatest(deviceId: string) {
    const state = await DeviceState.findOne({ 'metadata.deviceId': deviceId })
      .sort({ timestamp: -1 })
      .lean() as any;

    if (!state) return null;

    return {
      id: state._id,
      deviceId: state.metadata.deviceId,
      data: state.data,
      timestamp: state.timestamp,
    };
  }

  /**
   * Get oldest state for a device
   */
  async getOldest(deviceId: string) {
    const state = await DeviceState.findOne({ 'metadata.deviceId': deviceId })
      .sort({ timestamp: 1 })
      .lean() as any;

    if (!state) return null;

    return {
      id: state._id,
      deviceId: state.metadata.deviceId,
      data: state.data,
      timestamp: state.timestamp,
    };
  }

  /**
   * Get state count for a device
   */
  async count(deviceId: string, startTime?: Date, endTime?: Date): Promise<number> {
    const filter: any = {
      'metadata.deviceId': deviceId,
    };

    if (startTime || endTime) {
      filter.timestamp = {};
      if (startTime) filter.timestamp.$gte = startTime;
      if (endTime) filter.timestamp.$lte = endTime;
    }

    return DeviceState.countDocuments(filter);
  }

  /**
   * Delete old states (cleanup)
   *
   * Note: MongoDB Time Series collections have built-in TTL via expireAfterSeconds,
   * but this method allows manual cleanup for specific devices.
   */
  async deleteOldStates(deviceId: string, beforeDate: Date) {
    const result = await DeviceState.deleteMany({
      'metadata.deviceId': deviceId,
      timestamp: { $lt: beforeDate },
    });

    return result.deletedCount;
  }

  /**
   * Aggregate device states using MongoDB aggregation pipeline
   *
   * Replaces TimescaleDB time_bucket with MongoDB $dateTrunc
   */
  async aggregate(deviceId: string, data: AggregateDeviceStatesDTO) {
    const { startTime, endTime, bucket, fields, functions } = data;

    const { unit, binSize } = this.getBucketConfig(bucket);

    // Build aggregation expressions for each field/function combination
    const groupAccumulators: any = {};
    fields.forEach((field) => {
      functions.forEach((func) => {
        const key = `${field}_${func}`;
        groupAccumulators[key] = this.getAggregationExpression(func, field);
      });
    });

    const pipeline: any[] = [
      // Match by device and time range
      {
        $match: {
          'metadata.deviceId': deviceId,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      // Group by time bucket
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$timestamp',
              unit,
              binSize,
            },
          },
          ...groupAccumulators,
        },
      },
      // Sort by bucket ascending
      { $sort: { _id: 1 } },
    ];

    const result = await DeviceState.aggregate(pipeline);

    return {
      deviceId,
      startTime,
      endTime,
      bucket,
      data: result.map((row: any) => ({
        bucket: row._id,
        values: Object.entries(row)
          .filter(([key]) => key !== '_id')
          .reduce((acc, [key, value]) => {
            acc[key] = value as number;
            return acc;
          }, {} as Record<string, number>),
      })),
    };
  }

  /**
   * Get simple statistics for a field
   */
  async getStatistics(
    deviceId: string,
    field: string,
    startTime: Date,
    endTime: Date
  ) {
    const pipeline = [
      {
        $match: {
          'metadata.deviceId': deviceId,
          timestamp: { $gte: startTime, $lte: endTime },
          [`data.${field}`]: { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: { $toDouble: `$data.${field}` } },
          min: { $min: { $toDouble: `$data.${field}` } },
          max: { $max: { $toDouble: `$data.${field}` } },
          count: { $sum: 1 },
        },
      },
    ];

    const result = await DeviceState.aggregate(pipeline);
    const stats = result[0] || { avg: null, min: null, max: null, count: 0 };

    return {
      avg: stats.avg !== null ? Number(stats.avg) : null,
      min: stats.min !== null ? Number(stats.min) : null,
      max: stats.max !== null ? Number(stats.max) : null,
      count: Number(stats.count),
    };
  }

  /**
   * Get states for multiple devices (batch query)
   */
  async getStatesForDevices(
    deviceIds: string[],
    startTime?: Date,
    endTime?: Date,
    limit = 100
  ) {
    const filter: any = {
      'metadata.deviceId': { $in: deviceIds },
    };

    if (startTime || endTime) {
      filter.timestamp = {};
      if (startTime) filter.timestamp.$gte = startTime;
      if (endTime) filter.timestamp.$lte = endTime;
    }

    const states = await DeviceState.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * deviceIds.length)
      .lean();

    // Group by deviceId and transform to flat format
    return deviceIds.map((deviceId) => ({
      deviceId,
      states: (states as any[])
        .filter((s) => s.metadata.deviceId === deviceId)
        .slice(0, limit)
        .map((s) => ({
          id: s._id,
          deviceId: s.metadata.deviceId,
          data: s.data,
          timestamp: s.timestamp,
        })),
    }));
  }

  /**
   * Patch a DeviceState's data field with structured key-value pairs (ADR-022)
   * Used by action:writeDeviceState workflow node to overlay typed values
   */
  async patchData(
    deviceId: string,
    stateId: string,
    patch: Record<string, any>
  ): Promise<boolean> {
    const setFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(patch)) {
      setFields[`data.${key}`] = value;
    }

    const result = await DeviceState.updateOne(
      { _id: new mongoose.Types.ObjectId(stateId), 'metadata.deviceId': deviceId },
      { $set: setFields }
    );

    return result.modifiedCount > 0;
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Convert TimeBucket to MongoDB $dateTrunc unit and binSize
   */
  private getBucketConfig(bucket: TimeBucket): { unit: string; binSize: number } {
    const configs: Record<TimeBucket, { unit: string; binSize: number }> = {
      '1m': { unit: 'minute', binSize: 1 },
      '5m': { unit: 'minute', binSize: 5 },
      '15m': { unit: 'minute', binSize: 15 },
      '1h': { unit: 'hour', binSize: 1 },
      '6h': { unit: 'hour', binSize: 6 },
      '1d': { unit: 'day', binSize: 1 },
      '1w': { unit: 'week', binSize: 1 },
    };
    return configs[bucket];
  }

  /**
   * Generate MongoDB aggregation expression for a function/field combination
   */
  private getAggregationExpression(func: AggregationFunction, field: string): any {
    const fieldPath = `$data.${field}`;
    const numericField = { $toDouble: fieldPath };

    switch (func) {
      case 'avg':
        return { $avg: numericField };
      case 'min':
        return { $min: numericField };
      case 'max':
        return { $max: numericField };
      case 'sum':
        return { $sum: numericField };
      case 'count':
        return { $sum: 1 };
      case 'first':
        return { $first: numericField };
      case 'last':
        return { $last: numericField };
      default:
        throw new Error(`Unsupported aggregation function: ${func}`);
    }
  }
}

// Export singleton instance
export const deviceStateService = new DeviceStateService();
