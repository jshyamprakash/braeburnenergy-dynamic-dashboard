import type { FastifyRequest, FastifyReply } from 'fastify';
import { deviceService } from '../services/device.service';
import { deviceStateService } from '../services/device-state.service';
import { deviceDerivedStateService } from '../services/device-derived-state.service';
import { DataQualityService } from '../services/data-quality.service';
import { AlarmService } from '../services/alarm.service';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { sendSuccess, sendCreated, sendPaginated } from '../lib/response';
import { getRequestContext } from '../lib/request-context';
import type {
  CreateDeviceStateDTO,
  BulkCreateDeviceStatesDTO,
  QueryDeviceStatesDTO,
  AggregateDeviceStatesDTO,
} from '../schemas/device-state.schema';
import type { DeviceIdParam } from '../schemas/device.schema';
import { broadcastDeviceState } from '../websocket/server';

/**
 * DeviceStateController
 *
 * HTTP request handlers for device state/telemetry management.
 * Zero try/catch — errors propagate to global error handler.
 *
 * WebSocket (io) and triggerDispatcher are accessed via request.server
 * (typed by FastifyInstance augmentation in lib/request-context.ts).
 */
export class DeviceStateController {
  private dataQualityService = new DataQualityService();
  private alarmService = new AlarmService();

  /**
   * POST /devices/:deviceId/states
   */
  async create(
    request: FastifyRequest<{ Params: DeviceIdParam; Body: Omit<CreateDeviceStateDTO, 'deviceId'> }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { deviceId } = request.params;

    // Get device info (need tags for alarm evaluation)
    const device = await deviceService.getByDeviceId(orgId, deviceId);
    if (!device) {
      throw new NotFoundError('Device');
    }

    const validatedData = {
      ...request.body,
      deviceId,
    } as CreateDeviceStateDTO;

    // Validate data quality (EPA/AWWA compliance)
    const validationResult = await this.dataQualityService.validateDeviceState(
      deviceId,
      validatedData.data as Record<string, any>,
      validatedData.timestamp ? new Date(validatedData.timestamp) : new Date()
    );

    if (!validationResult.isValid) {
      request.log.warn(
        { deviceId, errors: validationResult.errors, warnings: validationResult.warnings, quality: validationResult.quality },
        'Data quality validation issues detected'
      );
    }

    // Create state with quality metadata
    const state = await deviceStateService.create(orgId, {
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

    if (triggeredAlarms.length > 0) {
      request.log.warn(
        { deviceId, alarmCount: triggeredAlarms.length, alarms: triggeredAlarms.map(a => ({ tagName: a.tagName, priority: a.priority, value: a.triggerValue })) },
        'Alarms triggered'
      );
    }

    // Dispatch to trigger workflows (fire-and-forget)
    const triggerDispatcher = request.server.triggerDispatcher;
    if (triggerDispatcher) {
      triggerDispatcher
        .dispatchDeviceStateBatch(orgId, deviceId, validatedData.data as Record<string, any>, state as any)
        .catch((err: any) => {
          request.log.error(err, 'Workflow device state batch dispatch failed');
        });

      for (const alarm of triggeredAlarms) {
        triggerDispatcher.dispatchAlarmTriggered(orgId, alarm).catch((err: any) => {
          request.log.error(err, `Workflow alarm dispatch failed for alarm ${alarm._id}`);
        });
      }
    }

    // Broadcast to WebSocket subscribers
    const io = request.server.io;
    if (io) {
      broadcastDeviceState(io, {
        deviceId: state.deviceId,
        data: state.data as Record<string, unknown>,
        derived: undefined,
        timestamp: state.timestamp,
      });

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

    return sendCreated(reply, state);
  }

  /**
   * POST /states/bulk
   */
  async bulkCreate(
    request: FastifyRequest<{ Body: BulkCreateDeviceStatesDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { states } = request.body;

    const statesWithQuality = await Promise.all(
      states.map(async (state) => {
        const validationResult = await this.dataQualityService.validateDeviceState(
          state.deviceId,
          state.data as Record<string, any>,
          state.timestamp ? new Date(state.timestamp) : new Date()
        );

        if (!validationResult.isValid) {
          request.log.warn(
            { deviceId: state.deviceId, errors: validationResult.errors, warnings: validationResult.warnings, quality: validationResult.quality },
            'Bulk ingestion: Data quality validation issues detected'
          );
        }

        return { ...state, quality: validationResult.quality };
      })
    );

    const result = await deviceStateService.bulkCreate(orgId, { states: statesWithQuality });

    return sendCreated(reply, {
      count: result.count,
      message: `Successfully created ${result.count} device states`,
    });
  }

  /**
   * GET /devices/:deviceId/states
   */
  async list(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: QueryDeviceStatesDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { deviceId } = request.params;

    const device = await deviceService.getByDeviceId(orgId, deviceId);
    if (!device) {
      throw new NotFoundError('Device');
    }

    const result = await deviceStateService.getStates(orgId, deviceId, request.query);
    return sendPaginated(reply, result.data, result.pagination);
  }

  /**
   * GET /devices/:deviceId/states/latest
   */
  async getLatest(
    request: FastifyRequest<{ Params: DeviceIdParam }>,
    reply: FastifyReply
  ) {
    const { deviceId } = request.params;
    const state = await deviceStateService.getLatest(deviceId);

    if (!state) {
      throw new NotFoundError('State');
    }

    return sendSuccess(reply, state);
  }

  /**
   * GET /devices/:deviceId/states/aggregate
   */
  async aggregate(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: AggregateDeviceStatesDTO }>,
    reply: FastifyReply
  ) {
    const { deviceId } = request.params;
    const result = await deviceStateService.aggregate(deviceId, request.query);
    return sendSuccess(reply, result);
  }

  /**
   * GET /devices/:deviceId/states/statistics
   */
  async getStatistics(
    request: FastifyRequest<{
      Params: DeviceIdParam;
      Querystring: { field: string; startTime: string; endTime: string };
    }>,
    reply: FastifyReply
  ) {
    const { deviceId } = request.params;
    const { field, startTime, endTime } = request.query;

    if (!field || !startTime || !endTime) {
      throw new BadRequestError('field, startTime, and endTime are required');
    }

    const stats = await deviceStateService.getStatistics(
      deviceId,
      field,
      new Date(startTime),
      new Date(endTime)
    );

    return sendSuccess(reply, {
      field,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      statistics: stats,
    });
  }

  /**
   * GET /devices/:deviceId/states/count
   */
  async count(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: { startTime?: string; endTime?: string } }>,
    reply: FastifyReply
  ) {
    const { deviceId } = request.params;
    const { startTime, endTime } = request.query;

    const count = await deviceStateService.count(
      deviceId,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined
    );

    return sendSuccess(reply, { count });
  }

  /**
   * GET /devices/:deviceId/derived-state (ADR-039)
   * Returns canonical live snapshot from device_derived_states.
   * Dashboard must use this — not /states/latest (time-series).
   */
  async getDerivedState(
    request: FastifyRequest<{ Params: DeviceIdParam }>,
    reply: FastifyReply
  ) {
    const { deviceId } = request.params;
    const doc = await deviceDerivedStateService.getLatest(deviceId);
    if (!doc) {
      throw new NotFoundError('Derived state');
    }
    return sendSuccess(reply, doc);
  }

  /**
   * GET /devices/:deviceId/derived-state/history
   * Returns N historical derived state records (newest first) from device_derived_state_history.
   * Used to seed dashboard chart and live stream with N points on load.
   */
  async getDerivedStateHistory(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) {
    const { deviceId } = request.params;
    const rawLimit = parseInt(request.query.limit ?? '50', 10);
    const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 500);
    const history = await deviceDerivedStateService.getHistory(deviceId, limit);
    return sendSuccess(reply, history);
  }

  /**
   * PATCH /devices/:deviceId/states/:stateId
   */
  async patchData(
    request: FastifyRequest<{ Params: { deviceId: string; stateId: string }; Body: { data: Record<string, any> } }>,
    reply: FastifyReply
  ) {
    const { deviceId, stateId } = request.params;
    const { data } = request.body;

    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestError('data cannot be empty');
    }

    // ADR-031: derived values go to device_derived_states (not device_states)
    await deviceDerivedStateService.upsert(deviceId, data, stateId);

    return sendSuccess(reply, { patched: true });
  }

  /**
   * DELETE /devices/:deviceId/states/old
   */
  async deleteOld(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: { beforeDate: string } }>,
    reply: FastifyReply
  ) {
    const { deviceId } = request.params;
    const { beforeDate } = request.query;

    if (!beforeDate) {
      throw new BadRequestError('beforeDate query parameter is required');
    }

    const count = await deviceStateService.deleteOldStates(deviceId, new Date(beforeDate));

    return sendSuccess(reply, {
      deleted: count,
      message: `Deleted ${count} old states`,
    });
  }
}

export const deviceStateController = new DeviceStateController();
