import type { FastifyRequest, FastifyReply } from 'fastify';
import { RetentionPolicyService } from '../services/retention-policy.service';
import type { DataCategory } from '../models';
import { NotFoundError } from '../lib/errors';
import { sendSuccess, sendCreated, sendDeleted } from '../lib/response';

const retentionPolicyService = new RetentionPolicyService();

/**
 * RetentionPolicyController
 *
 * EPA-compliant data retention policy management.
 * Zero try/catch — errors propagate to global error handler.
 */
export class RetentionPolicyController {
  async createRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
    const policy = await retentionPolicyService.createPolicy(request.body as any);
    return sendCreated(reply, policy);
  }

  async listRetentionPolicies(request: FastifyRequest, reply: FastifyReply) {
    const { category, isActive } = request.query as { category?: DataCategory; isActive?: string };

    const filter: any = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const policies = await retentionPolicyService.listPolicies(filter);
    return sendSuccess(reply, policies);
  }

  async getRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const policy = await retentionPolicyService.getPolicyById(id);

    if (!policy) {
      throw new NotFoundError('Retention policy');
    }

    return sendSuccess(reply, policy);
  }

  async getActiveRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
    const { category } = request.params as { category: DataCategory };
    const policy = await retentionPolicyService.getActivePolicy(category);

    if (!policy) {
      throw new NotFoundError(`Retention policy for category ${category}`);
    }

    return sendSuccess(reply, policy);
  }

  async updateRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const policy = await retentionPolicyService.updatePolicy(id, request.body as any);

    if (!policy) {
      throw new NotFoundError('Retention policy');
    }

    return sendSuccess(reply, policy);
  }

  async deleteRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const deleted = await retentionPolicyService.deletePolicy(id);

    if (!deleted) {
      throw new NotFoundError('Retention policy');
    }

    return sendDeleted(reply, 'Retention policy deleted successfully');
  }

  async getRetentionStats(request: FastifyRequest, reply: FastifyReply) {
    const { category } = request.params as { category: DataCategory };
    const stats = await retentionPolicyService.getRetentionStats(category);

    return sendSuccess(reply, stats ?? {
      policy: null, hotStorageDays: 0, warmStorageDays: 0, coldStorageDays: 0,
      totalRetentionDays: 0, archiveEnabled: false,
    });
  }
}

export const retentionPolicyController = new RetentionPolicyController();

// Legacy named function exports
export const createRetentionPolicy = (req: FastifyRequest, reply: FastifyReply) => retentionPolicyController.createRetentionPolicy(req, reply);
export const listRetentionPolicies = (req: FastifyRequest, reply: FastifyReply) => retentionPolicyController.listRetentionPolicies(req, reply);
export const getRetentionPolicy = (req: FastifyRequest, reply: FastifyReply) => retentionPolicyController.getRetentionPolicy(req, reply);
export const getActiveRetentionPolicy = (req: FastifyRequest, reply: FastifyReply) => retentionPolicyController.getActiveRetentionPolicy(req, reply);
export const updateRetentionPolicy = (req: FastifyRequest, reply: FastifyReply) => retentionPolicyController.updateRetentionPolicy(req, reply);
export const deleteRetentionPolicy = (req: FastifyRequest, reply: FastifyReply) => retentionPolicyController.deleteRetentionPolicy(req, reply);
export const getRetentionStats = (req: FastifyRequest, reply: FastifyReply) => retentionPolicyController.getRetentionStats(req, reply);
