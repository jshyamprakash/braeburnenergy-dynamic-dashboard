import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationRule } from '../models';
import { DataQualityService } from '../services/data-quality.service';

/**
 * ValidationRuleController
 *
 * Manages data validation rules for quality assurance.
 */

const dataQualityService = new DataQualityService();

/**
 * Create validation rule (SuperAdmin and Admin)
 */
export async function createValidationRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = request.body as any;

    const rule = await ValidationRule.create({
      ...data,
      appliedAt: data.isActive ? new Date() : undefined,
    });

    return reply.status(201).send({
      success: true,
      data: rule,
    });
  } catch (error) {
    request.log.error({ error }, 'Create validation rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create validation rule',
    });
  }
}

/**
 * List validation rules
 */
export async function listValidationRules(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { deviceId, field, validationType, isActive } = request.query as any;

    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (field) filter.field = field;
    if (validationType) filter.validationType = validationType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const rules = await ValidationRule.find(filter).sort({ field: 1, createdAt: -1 });

    return reply.status(200).send({
      success: true,
      data: rules,
    });
  } catch (error) {
    request.log.error({ error }, 'List validation rules error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve validation rules',
    });
  }
}

/**
 * Get validation rule by ID
 */
export async function getValidationRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const rule = await ValidationRule.findById(id);

    if (!rule) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Validation rule not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: rule,
    });
  } catch (error) {
    request.log.error({ error }, 'Get validation rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve validation rule',
    });
  }
}

/**
 * Update validation rule (SuperAdmin and Admin)
 */
export async function updateValidationRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const updates = request.body as any;

    const rule = await ValidationRule.findByIdAndUpdate(
      id,
      {
        ...updates,
        appliedAt: updates.isActive ? new Date() : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!rule) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Validation rule not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: rule,
    });
  } catch (error) {
    request.log.error({ error }, 'Update validation rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update validation rule',
    });
  }
}

/**
 * Delete validation rule (SuperAdmin and Admin)
 */
export async function deleteValidationRule(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const result = await ValidationRule.findByIdAndDelete(id);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Validation rule not found',
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Validation rule deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Delete validation rule error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete validation rule',
    });
  }
}

/**
 * Get quality statistics for a device
 */
export async function getQualityStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { deviceId } = request.params as { deviceId: string };
    const { days = 7 } = request.query as { days?: number };

    const stats = await dataQualityService.getQualityStats(deviceId, Number(days));

    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Get quality stats error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve quality statistics',
    });
  }
}

/**
 * Manual quality review (Admin+)
 */
export async function manualQualityReview(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { stateId } = request.params as { stateId: string };
    const { status, comment } = request.body as { status: string; comment: string };
    const user = (request as any).user;

    if (!status || !['GOOD', 'BAD', 'QUESTIONABLE', 'ESTIMATED'].includes(status)) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'Invalid quality status',
      });
    }

    const updated = await dataQualityService.manualQualityReview(
      stateId,
      status as any,
      comment || '',
      user.id
    );

    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Device state not found',
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Quality status updated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Manual quality review error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update quality status',
    });
  }
}
