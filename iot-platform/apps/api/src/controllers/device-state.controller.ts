import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import { deviceService } from '../services/device.service';
import { deviceStateService } from '../services/device-state.service';
import {
  createDeviceStateSchema,
  bulkCreateDeviceStatesSchema,
  queryDeviceStatesSchema,
  aggregateDeviceStatesSchema,
  type CreateDeviceStateDTO,
  type BulkCreateDeviceStatesDTO,
  type QueryDeviceStatesDTO,
  type AggregateDeviceStatesDTO,
} from '../schemas/device-state.schema';
import { deviceIdParamSchema, type DeviceIdParam } from '../schemas/device.schema';
import { broadcastDeviceState } from '../websocket/server';

/**
 * DeviceStateController
 *
 * HTTP request handlers for device state/telemetry management
 * Handles time-series data ingestion, queries, and aggregations
 */
export class DeviceStateController {
  /**
   * POST /devices/:deviceId/states
   * Create a new device state
   */
  async create(
    request: FastifyRequest<{ Params: DeviceIdParam; Body: Omit<CreateDeviceStateDTO, 'deviceId'> }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params
      const { deviceId } = deviceIdParamSchema.parse(request.params);

      // Validate body and add deviceId from params
      const validatedData = createDeviceStateSchema.parse({
        ...request.body,
        deviceId,
      });

      // Create state
      const state = await deviceStateService.create(validatedData);

      // Broadcast to WebSocket subscribers
      const io = (request.server as any).io as SocketIOServer;
      if (io) {
        broadcastDeviceState(io, {
          deviceId: state.deviceId,
          data: state.data as Record<string, unknown>,
          timestamp: state.timestamp,
        });
      }

      return reply.code(201).send({
        success: true,
        data: state,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error,
        });
      }

      // Check for foreign key constraint (device doesn't exist)
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        return reply.code(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      request.log.error(error, 'Error creating device state');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /states/bulk
   * Bulk create device states (batch ingestion)
   */
  async bulkCreate(
    request: FastifyRequest<{ Body: BulkCreateDeviceStatesDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate body
      const validatedData = bulkCreateDeviceStatesSchema.parse(request.body);

      // Bulk create
      const result = await deviceStateService.bulkCreate(validatedData);

      return reply.code(201).send({
        success: true,
        data: {
          count: result.count,
          message: `Successfully created ${result.count} device states`,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error,
        });
      }

      request.log.error(error, 'Error bulk creating device states');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/:deviceId/states
   * Get device states with time-range filtering and pagination
   */
  async list(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: QueryDeviceStatesDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params and query
      const { deviceId } = deviceIdParamSchema.parse(request.params);
      const validatedQuery = queryDeviceStatesSchema.parse(request.query);

      // Check if device exists
      const device = await deviceService.getByDeviceId(deviceId);
      if (!device) {
        return reply.code(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      // Get states
      const result = await deviceStateService.getStates(deviceId, validatedQuery);

      return reply.code(200).send({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid parameters',
          details: error,
        });
      }

      request.log.error(error, 'Error listing device states');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/:deviceId/states/latest
   * Get latest state for a device
   */
  async getLatest(
    request: FastifyRequest<{ Params: DeviceIdParam }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params
      const { deviceId } = deviceIdParamSchema.parse(request.params);

      // Get latest state
      const state = await deviceStateService.getLatest(deviceId);

      if (!state) {
        return reply.code(404).send({
          success: false,
          error: 'No states found for this device',
        });
      }

      return reply.code(200).send({
        success: true,
        data: state,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid device ID',
          details: error,
        });
      }

      request.log.error(error, 'Error fetching latest state');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/:deviceId/states/aggregate
   * Get aggregated device states (downsampled time-series)
   */
  async aggregate(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: AggregateDeviceStatesDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params and query
      const { deviceId } = deviceIdParamSchema.parse(request.params);
      const validatedQuery = aggregateDeviceStatesSchema.parse(request.query);

      // Aggregate data
      const result = await deviceStateService.aggregate(deviceId, validatedQuery);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid parameters',
          details: error,
        });
      }

      request.log.error(error, 'Error aggregating device states');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/:deviceId/states/statistics
   * Get statistical summary for a field
   */
  async getStatistics(
    request: FastifyRequest<{
      Params: DeviceIdParam;
      Querystring: { field: string; startTime: string; endTime: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params
      const { deviceId } = deviceIdParamSchema.parse(request.params);
      const { field, startTime, endTime } = request.query;

      if (!field || !startTime || !endTime) {
        return reply.code(400).send({
          success: false,
          error: 'field, startTime, and endTime are required',
        });
      }

      // Get statistics
      const stats = await deviceStateService.getStatistics(
        deviceId,
        field,
        new Date(startTime),
        new Date(endTime)
      );

      return reply.code(200).send({
        success: true,
        data: {
          field,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          statistics: stats,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid parameters',
          details: error,
        });
      }

      request.log.error(error, 'Error fetching statistics');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/:deviceId/states/count
   * Get state count for a device
   */
  async count(
    request: FastifyRequest<{
      Params: DeviceIdParam;
      Querystring: { startTime?: string; endTime?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params
      const { deviceId } = deviceIdParamSchema.parse(request.params);
      const { startTime, endTime } = request.query;

      const count = await deviceStateService.count(
        deviceId,
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined
      );

      return reply.code(200).send({
        success: true,
        data: { count },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid device ID',
          details: error,
        });
      }

      request.log.error(error, 'Error counting states');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /devices/:deviceId/states/old
   * Delete old states (cleanup)
   */
  async deleteOld(
    request: FastifyRequest<{
      Params: DeviceIdParam;
      Querystring: { beforeDate: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params
      const { deviceId } = deviceIdParamSchema.parse(request.params);
      const { beforeDate } = request.query;

      if (!beforeDate) {
        return reply.code(400).send({
          success: false,
          error: 'beforeDate query parameter is required',
        });
      }

      const count = await deviceStateService.deleteOldStates(
        deviceId,
        new Date(beforeDate)
      );

      return reply.code(200).send({
        success: true,
        data: {
          deleted: count,
          message: `Deleted ${count} old states`,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid parameters',
          details: error,
        });
      }

      request.log.error(error, 'Error deleting old states');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

// Export singleton instance
export const deviceStateController = new DeviceStateController();
