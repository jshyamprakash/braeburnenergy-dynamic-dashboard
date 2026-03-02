import type { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationRule } from '../models';
import { DataQualityService } from '../services/data-quality.service';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { sendSuccess, sendCreated, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';

const dataQualityService = new DataQualityService();

/**
 * ValidationRuleController
 *
 * Manages data validation rules for EPA/AWWA quality assurance.
 * Zero try/catch — errors propagate to global error handler.
 */
export class ValidationRuleController {
  async createValidationRule(request: FastifyRequest, reply: FastifyReply) {
    const data = request.body as any;
    const rule = await ValidationRule.create({ ...data, appliedAt: data.isActive ? new Date() : undefined });
    return sendCreated(reply, rule);
  }

  async listValidationRules(request: FastifyRequest, reply: FastifyReply) {
    const { deviceId, field, validationType, isActive } = request.query as any;

    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (field) filter.field = field;
    if (validationType) filter.validationType = validationType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const rules = await ValidationRule.find(filter).sort({ field: 1, createdAt: -1 });
    return sendSuccess(reply, rules);
  }

  async getValidationRule(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const rule = await ValidationRule.findById(id);

    if (!rule) {
      throw new NotFoundError('Validation rule');
    }

    return sendSuccess(reply, rule);
  }

  async updateValidationRule(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const updates = request.body as any;

    const rule = await ValidationRule.findByIdAndUpdate(
      id,
      { ...updates, appliedAt: updates.isActive ? new Date() : undefined },
      { new: true, runValidators: true }
    );

    if (!rule) {
      throw new NotFoundError('Validation rule');
    }

    return sendSuccess(reply, rule);
  }

  async deleteValidationRule(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await ValidationRule.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundError('Validation rule');
    }

    return sendDeleted(reply, 'Validation rule deleted successfully');
  }

  async getQualityStats(request: FastifyRequest, reply: FastifyReply) {
    const { deviceId } = request.params as { deviceId: string };
    const { days = 7 } = request.query as { days?: number };
    const stats = await dataQualityService.getQualityStats(deviceId, Number(days));
    return sendSuccess(reply, stats);
  }

  async manualQualityReview(request: FastifyRequest, reply: FastifyReply) {
    const { stateId } = request.params as { stateId: string };
    const { status, comment } = request.body as { status: string; comment: string };
    const { userId } = getRequestContext(request);

    const validStatuses = ['GOOD', 'BAD', 'QUESTIONABLE', 'ESTIMATED'];
    if (!status || !validStatuses.includes(status)) {
      throw new BadRequestError('Invalid quality status');
    }

    const updated = await dataQualityService.manualQualityReview(stateId, status as any, comment || '', userId);

    if (!updated) {
      throw new NotFoundError('Device state');
    }

    return sendSuccess(reply, { message: 'Quality status updated successfully' });
  }
}

export const validationRuleController = new ValidationRuleController();

// Legacy named function exports
export const createValidationRule = (req: FastifyRequest, reply: FastifyReply) => validationRuleController.createValidationRule(req, reply);
export const listValidationRules = (req: FastifyRequest, reply: FastifyReply) => validationRuleController.listValidationRules(req, reply);
export const getValidationRule = (req: FastifyRequest, reply: FastifyReply) => validationRuleController.getValidationRule(req, reply);
export const updateValidationRule = (req: FastifyRequest, reply: FastifyReply) => validationRuleController.updateValidationRule(req, reply);
export const deleteValidationRule = (req: FastifyRequest, reply: FastifyReply) => validationRuleController.deleteValidationRule(req, reply);
export const getQualityStats = (req: FastifyRequest, reply: FastifyReply) => validationRuleController.getQualityStats(req, reply);
export const manualQualityReview = (req: FastifyRequest, reply: FastifyReply) => validationRuleController.manualQualityReview(req, reply);
