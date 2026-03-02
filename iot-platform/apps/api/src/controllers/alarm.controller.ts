import type { FastifyRequest, FastifyReply } from 'fastify';
import { AlarmRule, AlarmInstance } from '../models';
import { AlarmService } from '../services/alarm.service';
import { NotFoundError } from '../lib/errors';
import { sendSuccess, sendCreated, sendPaginated, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';

const alarmService = new AlarmService();

/**
 * AlarmController
 *
 * HTTP handlers for ISA-18.2 alarm management.
 * Zero try/catch — errors propagate to global error handler.
 */
export class AlarmController {
  /**
   * POST /alarm-rules
   */
  async createAlarmRule(request: FastifyRequest, reply: FastifyReply) {
    const rule = await AlarmRule.create(request.body as any);
    return sendCreated(reply, rule);
  }

  /**
   * GET /alarm-rules
   */
  async listAlarmRules(request: FastifyRequest, reply: FastifyReply) {
    const { deviceId, field, priority, isActive, isEnabled, isShelved } = request.query as any;

    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (field) filter.field = field;
    if (priority) filter.priority = priority;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isEnabled !== undefined) filter.isEnabled = isEnabled === 'true';
    if (isShelved !== undefined) filter.isShelved = isShelved === 'true';

    const rules = await AlarmRule.find(filter).sort({ priority: 1, field: 1, createdAt: -1 });
    return sendSuccess(reply, rules);
  }

  /**
   * GET /alarm-rules/:id
   */
  async getAlarmRule(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const rule = await AlarmRule.findById(id);

    if (!rule) {
      throw new NotFoundError('Alarm rule');
    }

    return sendSuccess(reply, rule);
  }

  /**
   * PATCH /alarm-rules/:id
   */
  async updateAlarmRule(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const rule = await AlarmRule.findByIdAndUpdate(id, request.body as any, { new: true, runValidators: true });

    if (!rule) {
      throw new NotFoundError('Alarm rule');
    }

    return sendSuccess(reply, rule);
  }

  /**
   * DELETE /alarm-rules/:id
   */
  async deleteAlarmRule(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await AlarmRule.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundError('Alarm rule');
    }

    return sendDeleted(reply, 'Alarm rule deleted successfully');
  }

  /**
   * POST /alarm-rules/:id/shelve
   */
  async shelveAlarmRule(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { reason, duration } = request.body as { reason: string; duration?: number };
    const { userId } = getRequestContext(request);

    const rule = await AlarmRule.findById(id);
    if (!rule) {
      throw new NotFoundError('Alarm rule');
    }

    rule.isShelved = true;
    rule.shelvedBy = userId;
    rule.shelvedReason = reason;
    if (duration) {
      rule.shelvedUntil = new Date(Date.now() + duration * 1000);
    }
    await rule.save();

    return sendSuccess(reply, rule);
  }

  /**
   * POST /alarm-rules/:id/unshelve
   */
  async unshelveAlarmRule(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const rule = await AlarmRule.findById(id);
    if (!rule) {
      throw new NotFoundError('Alarm rule');
    }

    rule.isShelved = false;
    rule.shelvedUntil = undefined;
    rule.shelvedBy = undefined;
    rule.shelvedReason = undefined;
    await rule.save();

    return sendSuccess(reply, rule);
  }

  /**
   * GET /alarms
   */
  async listAlarms(request: FastifyRequest, reply: FastifyReply) {
    const { deviceId, state, priority, startTime, endTime, limit = 100, offset = 0 } = request.query as any;

    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (state) filter.state = state;
    if (priority) filter.priority = priority;

    if (startTime || endTime) {
      filter.activeTimestamp = {};
      if (startTime) filter.activeTimestamp.$gte = new Date(startTime);
      if (endTime) filter.activeTimestamp.$lte = new Date(endTime);
    }

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    const [alarms, total] = await Promise.all([
      AlarmInstance.find(filter)
        .sort({ priority: 1, activeTimestamp: -1 })
        .limit(limitNum)
        .skip(offsetNum)
        .populate('alarmRuleId')
        .lean(),
      AlarmInstance.countDocuments(filter),
    ]);

    return sendPaginated(reply, alarms, { total, limit: limitNum, offset: offsetNum, hasMore: total > offsetNum + limitNum });
  }

  /**
   * GET /alarms/:id
   */
  async getAlarm(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const alarm = await AlarmInstance.findById(id).populate('alarmRuleId');

    if (!alarm) {
      throw new NotFoundError('Alarm');
    }

    return sendSuccess(reply, alarm);
  }

  /**
   * POST /alarms/:id/acknowledge
   */
  async acknowledgeAlarm(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { comment } = request.body as { comment?: string };
    const { userId } = getRequestContext(request);

    const alarm = await alarmService.acknowledgeAlarm(id, userId, comment);

    if (!alarm) {
      throw new NotFoundError('Alarm');
    }

    return sendSuccess(reply, alarm);
  }

  /**
   * POST /alarms/:id/shelve
   */
  async shelveAlarm(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { reason, duration } = request.body as { reason: string; duration?: number };
    const { userId } = getRequestContext(request);

    const alarm = await alarmService.shelveAlarm(id, userId, reason, duration);

    if (!alarm) {
      throw new NotFoundError('Alarm');
    }

    return sendSuccess(reply, alarm);
  }

  /**
   * POST /alarms/:id/unshelve
   */
  async unshelveAlarm(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { userId } = getRequestContext(request);

    const alarm = await alarmService.unshelveAlarm(id, userId);

    if (!alarm) {
      throw new NotFoundError('Alarm');
    }

    return sendSuccess(reply, alarm);
  }

  /**
   * GET /alarms/statistics
   */
  async getAlarmStatistics(request: FastifyRequest, reply: FastifyReply) {
    const { deviceId, days = 7 } = request.query as { deviceId?: string; days?: number };
    const stats = await alarmService.getAlarmStatistics(deviceId, Number(days));
    return sendSuccess(reply, stats);
  }

  /**
   * GET /devices/:deviceId/alarms/active
   */
  async getDeviceActiveAlarms(request: FastifyRequest, reply: FastifyReply) {
    const { deviceId } = request.params as { deviceId: string };
    const alarms = await alarmService.getActiveAlarms(deviceId);
    return sendSuccess(reply, alarms);
  }
}

export const alarmController = new AlarmController();

// Legacy named function exports for backward compat with existing routes
export const createAlarmRule = (req: FastifyRequest, reply: FastifyReply) => alarmController.createAlarmRule(req, reply);
export const listAlarmRules = (req: FastifyRequest, reply: FastifyReply) => alarmController.listAlarmRules(req, reply);
export const getAlarmRule = (req: FastifyRequest, reply: FastifyReply) => alarmController.getAlarmRule(req, reply);
export const updateAlarmRule = (req: FastifyRequest, reply: FastifyReply) => alarmController.updateAlarmRule(req, reply);
export const deleteAlarmRule = (req: FastifyRequest, reply: FastifyReply) => alarmController.deleteAlarmRule(req, reply);
export const shelveAlarmRule = (req: FastifyRequest, reply: FastifyReply) => alarmController.shelveAlarmRule(req, reply);
export const unshelveAlarmRule = (req: FastifyRequest, reply: FastifyReply) => alarmController.unshelveAlarmRule(req, reply);
export const listAlarms = (req: FastifyRequest, reply: FastifyReply) => alarmController.listAlarms(req, reply);
export const getAlarm = (req: FastifyRequest, reply: FastifyReply) => alarmController.getAlarm(req, reply);
export const acknowledgeAlarm = (req: FastifyRequest, reply: FastifyReply) => alarmController.acknowledgeAlarm(req, reply);
export const shelveAlarm = (req: FastifyRequest, reply: FastifyReply) => alarmController.shelveAlarm(req, reply);
export const unshelveAlarm = (req: FastifyRequest, reply: FastifyReply) => alarmController.unshelveAlarm(req, reply);
export const getAlarmStatistics = (req: FastifyRequest, reply: FastifyReply) => alarmController.getAlarmStatistics(req, reply);
export const getDeviceActiveAlarms = (req: FastifyRequest, reply: FastifyReply) => alarmController.getDeviceActiveAlarms(req, reply);
