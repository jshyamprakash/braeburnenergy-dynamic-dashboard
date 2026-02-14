import { FastifyRequest, FastifyReply } from 'fastify';
import { AlarmRule, AlarmInstance } from '../models';
import { AlarmService } from '../services/alarm.service';

/**
 * AlarmController
 *
 * HTTP handlers for ISA-18.2 alarm management.
 */

const alarmService = new AlarmService();

/**
 * POST /alarm-rules
 * Create alarm rule (Admin+)
 */
export async function createAlarmRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = request.body as any;

    const rule = await AlarmRule.create(data);

    return reply.status(201).send({
      success: true,
      data: rule,
    });
  } catch (error) {
    request.log.error({ error }, 'Create alarm rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create alarm rule',
    });
  }
}

/**
 * GET /alarm-rules
 * List alarm rules
 */
export async function listAlarmRules(request: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      deviceId,
      field,
      priority,
      isActive,
      isEnabled,
      isShelved,
    } = request.query as any;

    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (field) filter.field = field;
    if (priority) filter.priority = priority;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isEnabled !== undefined) filter.isEnabled = isEnabled === 'true';
    if (isShelved !== undefined) filter.isShelved = isShelved === 'true';

    const rules = await AlarmRule.find(filter).sort({ priority: 1, field: 1, createdAt: -1 });

    return reply.status(200).send({
      success: true,
      data: rules,
    });
  } catch (error) {
    request.log.error({ error }, 'List alarm rules error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve alarm rules',
    });
  }
}

/**
 * GET /alarm-rules/:id
 * Get alarm rule by ID
 */
export async function getAlarmRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const rule = await AlarmRule.findById(id);

    if (!rule) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm rule not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: rule,
    });
  } catch (error) {
    request.log.error({ error }, 'Get alarm rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve alarm rule',
    });
  }
}

/**
 * PATCH /alarm-rules/:id
 * Update alarm rule (Admin+)
 */
export async function updateAlarmRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const updates = request.body as any;

    const rule = await AlarmRule.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!rule) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm rule not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: rule,
    });
  } catch (error) {
    request.log.error({ error }, 'Update alarm rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update alarm rule',
    });
  }
}

/**
 * DELETE /alarm-rules/:id
 * Delete alarm rule (Admin+)
 */
export async function deleteAlarmRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const result = await AlarmRule.findByIdAndDelete(id);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm rule not found',
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Alarm rule deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Delete alarm rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete alarm rule',
    });
  }
}

/**
 * POST /alarm-rules/:id/shelve
 * Shelve alarm rule (Admin+)
 */
export async function shelveAlarmRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const { reason, duration } = request.body as { reason: string; duration?: number };
    const user = (request as any).user;

    const rule = await AlarmRule.findById(id);

    if (!rule) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm rule not found',
      });
    }

    rule.isShelved = true;
    rule.shelvedBy = user?.id || 'system';
    rule.shelvedReason = reason;

    if (duration) {
      rule.shelvedUntil = new Date(Date.now() + duration * 1000);
    }

    await rule.save();

    return reply.status(200).send({
      success: true,
      data: rule,
      message: 'Alarm rule shelved successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Shelve alarm rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to shelve alarm rule',
    });
  }
}

/**
 * POST /alarm-rules/:id/unshelve
 * Unshelve alarm rule (Admin+)
 */
export async function unshelveAlarmRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const rule = await AlarmRule.findById(id);

    if (!rule) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm rule not found',
      });
    }

    rule.isShelved = false;
    rule.shelvedUntil = undefined;
    rule.shelvedBy = undefined;
    rule.shelvedReason = undefined;

    await rule.save();

    return reply.status(200).send({
      success: true,
      data: rule,
      message: 'Alarm rule unshelved successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Unshelve alarm rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to unshelve alarm rule',
    });
  }
}

/**
 * GET /alarms
 * List alarm instances
 */
export async function listAlarms(request: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      deviceId,
      state,
      priority,
      startTime,
      endTime,
      limit = 100,
      offset = 0,
    } = request.query as any;

    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (state) filter.state = state;
    if (priority) filter.priority = priority;

    if (startTime || endTime) {
      filter.activeTimestamp = {};
      if (startTime) filter.activeTimestamp.$gte = new Date(startTime);
      if (endTime) filter.activeTimestamp.$lte = new Date(endTime);
    }

    const alarms = await AlarmInstance.find(filter)
      .sort({ priority: 1, activeTimestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('alarmRuleId')
      .lean();

    const total = await AlarmInstance.countDocuments(filter);

    return reply.status(200).send({
      success: true,
      data: alarms,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
      },
    });
  } catch (error) {
    request.log.error({ error }, 'List alarms error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve alarms',
    });
  }
}

/**
 * GET /alarms/:id
 * Get alarm instance by ID
 */
export async function getAlarm(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const alarm = await AlarmInstance.findById(id).populate('alarmRuleId');

    if (!alarm) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: alarm,
    });
  } catch (error) {
    request.log.error({ error }, 'Get alarm error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve alarm',
    });
  }
}

/**
 * POST /alarms/:id/acknowledge
 * Acknowledge alarm (Operator+)
 */
export async function acknowledgeAlarm(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const { comment } = request.body as { comment?: string };
    const user = (request as any).user;

    const alarm = await alarmService.acknowledgeAlarm(id, user?.id || 'system', comment);

    if (!alarm) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: alarm,
      message: 'Alarm acknowledged successfully',
    });
  } catch (error: any) {
    request.log.error({ error }, 'Acknowledge alarm error');

    if (error.message.includes('Cannot acknowledge')) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid operation',
        message: error.message,
      });
    }

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to acknowledge alarm',
    });
  }
}

/**
 * POST /alarms/:id/shelve
 * Shelve alarm instance (Admin+)
 */
export async function shelveAlarm(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const { reason, duration } = request.body as { reason: string; duration?: number };
    const user = (request as any).user;

    const alarm = await alarmService.shelveAlarm(id, user?.id || 'system', reason, duration);

    if (!alarm) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: alarm,
      message: 'Alarm shelved successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Shelve alarm error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to shelve alarm',
    });
  }
}

/**
 * POST /alarms/:id/unshelve
 * Unshelve alarm instance (Admin+)
 */
export async function unshelveAlarm(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const alarm = await alarmService.unshelveAlarm(id, user?.id || 'system');

    if (!alarm) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Alarm not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: alarm,
      message: 'Alarm unshelved successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Unshelve alarm error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to unshelve alarm',
    });
  }
}

/**
 * GET /alarms/statistics
 * Get alarm statistics
 */
export async function getAlarmStatistics(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { deviceId, days = 7 } = request.query as { deviceId?: string; days?: number };

    const stats = await alarmService.getAlarmStatistics(deviceId, Number(days));

    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Get alarm statistics error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve alarm statistics',
    });
  }
}

/**
 * GET /devices/:deviceId/alarms/active
 * Get active alarms for device
 */
export async function getDeviceActiveAlarms(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { deviceId } = request.params as { deviceId: string };

    const alarms = await alarmService.getActiveAlarms(deviceId);

    return reply.status(200).send({
      success: true,
      data: alarms,
    });
  } catch (error) {
    request.log.error({ error }, 'Get device active alarms error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve active alarms',
    });
  }
}
