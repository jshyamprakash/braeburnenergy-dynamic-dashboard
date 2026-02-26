import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import { deviceService } from '../services/device.service';
import { deviceStateService } from '../services/device-state.service';
import { deviceDerivedStateService } from '../services/device-derived-state.service';
import { DataQualityService } from '../services/data-quality.service';
import { AlarmService } from '../services/alarm.service';
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
 * Default organization ID for POC
 * TODO: Replace with orgId from JWT token or request header in MVP
 */
const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * DeviceStateController
 *
 * HTTP request handlers for device state/telemetry management
 * Handles time-series data ingestion, queries, and aggregations
 */
export class DeviceStateController {
  private dataQualityService = new DataQualityService();
  private alarmService = new AlarmService();

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

      // Get device info (need tags for alarm evaluation)
      const device = await deviceService.getByDeviceId(DEFAULT_ORG_ID, deviceId);
      if (!device) {
        return reply.code(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      // Validate data quality (EPA/AWWA compliance)
      const validationResult = await this.dataQualityService.validateDeviceState(
        deviceId,
        validatedData.data as Record<string, any>,
        validatedData.timestamp ? new Date(validatedData.timestamp) : new Date()
      );

      // Log quality issues if any
      if (!validationResult.isValid) {
        request.log.warn(
          {
            deviceId,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            quality: validationResult.quality,
          },
          'Data quality validation issues detected'
        );
      }

      // Create state with quality metadata
      const state = await deviceStateService.create(DEFAULT_ORG_ID, {
        ...validatedData,
        quality: validationResult.quality,
      });

      // Evaluate alarm conditions (ISA-18.2)
      const triggeredAlarms = await this.alarmService.evaluateDeviceState(
        deviceId,
        Object.keys(device.tags || {}),
        validatedData.data as Record<string, any>,
        state._id.toString(),
        validatedData.timestamp ? new Date(validatedData.timestamp) : new Date()
      );

      // Log triggered alarms
      if (triggeredAlarms.length > 0) {
        request.log.warn(
          {
            deviceId,
            alarmCount: triggeredAlarms.length,
            alarms: triggeredAlarms.map(a => ({ tagName: a.tagName, priority: a.priority, value: a.triggerValue })),
          },
          'Alarms triggered'
        );
      }

      // Dispatch to trigger workflows (fire-and-forget)
      const triggerDispatcher = (request.server as any).triggerDispatcher;
      if (triggerDispatcher) {
        // Dispatch for each field in the state data
        for (const [field, value] of Object.entries(validatedData.data as Record<string, any>)) {
          triggerDispatcher.dispatchDeviceStateChange(
            DEFAULT_ORG_ID,
            deviceId,
            field,
            value,
            state
          ).catch((err: any) => {
            request.log.error(err, `Workflow trigger dispatch failed for field ${field}`);
          });
        }

        // Dispatch triggered alarms to workflow engine
        for (const alarm of triggeredAlarms) {
          triggerDispatcher.dispatchAlarmTriggered(DEFAULT_ORG_ID, alarm).catch((err: any) => {
            request.log.error(err, `Workflow alarm dispatch failed for alarm ${alarm._id}`);
          });
        }
      }

      // Broadcast to WebSocket subscribers
      const io = (request.server as any).io as SocketIOServer;
      if (io) {
        broadcastDeviceState(io, {
          deviceId: state.deviceId,
          data: state.data as Record<string, unknown>,
          derived: undefined,
          timestamp: state.timestamp,
        });

        // Broadcast alarms
        if (triggeredAlarms.length > 0) {
          triggeredAlarms.forEach(alarm => {
            io.to(`device:${deviceId}`).emit('alarm:triggered', {
              alarmId: alarm._id.toString(),
              tagName: alarm.tagName,
              deviceId: alarm.deviceId,
              priority: alarm.priority,
              field: alarm.field,
              value: alarm.triggerValue,
              timestamp: alarm.triggerTimestamp,
              state: alarm.state,
            });
          });
        }
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

      // Check for device not found errors
      if (error instanceof Error && error.message.includes('Device not found')) {
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

      // Validate data quality for each state
      const statesWithQuality = await Promise.all(
        validatedData.states.map(async (state) => {
          const validationResult = await this.dataQualityService.validateDeviceState(
            state.deviceId,
            state.data as Record<string, any>,
            state.timestamp ? new Date(state.timestamp) : new Date()
          );

          // Log quality issues if any
          if (!validationResult.isValid) {
            request.log.warn(
              {
                deviceId: state.deviceId,
                errors: validationResult.errors,
                warnings: validationResult.warnings,
                quality: validationResult.quality,
              },
              'Bulk ingestion: Data quality validation issues detected'
            );
          }

          return {
            ...state,
            quality: validationResult.quality,
          };
        })
      );

      // Bulk create with quality metadata
      const result = await deviceStateService.bulkCreate(DEFAULT_ORG_ID, {
        states: statesWithQuality,
      });

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

      // Check if device exists (using default org for now)
      const device = await deviceService.getByDeviceId(DEFAULT_ORG_ID, deviceId);
      if (!device) {
        return reply.code(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      // Get states (using default org for now)
      const result = await deviceStateService.getStates(DEFAULT_ORG_ID, deviceId, validatedQuery);

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
   * PATCH /devices/:deviceId/states/:stateId
   * Patch device state data with structured key-value pairs (ADR-022)
   */
  async patchData(
    request: FastifyRequest<{ Params: { deviceId: string; stateId: string }; Body: { data: Record<string, any> } }>,
    reply: FastifyReply
  ) {
    try {
      const { deviceId, stateId } = request.params;
      const { data } = request.body;

      if (!data || Object.keys(data).length === 0) {
        return reply.code(400).send({ success: false, error: 'data cannot be empty' });
      }

      // ADR-031: derived values go to device_derived_states (not device_states)
      await deviceDerivedStateService.upsert(deviceId, data, stateId);
      const patched = true;

      if (!patched) {
        return reply.code(404).send({ success: false, error: 'State not found or no changes made' });
      }

      return reply.code(200).send({ success: true, data: { patched } });
    } catch (error) {
      request.log.error(error, 'Error patching device state');
      return reply.code(500).send({ success: false, error: 'Internal server error' });
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
