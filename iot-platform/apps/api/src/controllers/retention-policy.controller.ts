import { FastifyRequest, FastifyReply } from 'fastify';
import { RetentionPolicyService } from '../services/retention-policy.service';
import { DataCategory } from '../models';

/**
 * RetentionPolicyController
 *
 * Handles EPA-compliant data retention policy management.
 */

const retentionPolicyService = new RetentionPolicyService();

/**
 * Create a new retention policy (SuperAdmin only)
 */
export async function createRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = request.body as any;

    const policy = await retentionPolicyService.createPolicy(data);

    return reply.status(201).send({
      success: true,
      data: policy,
    });
  } catch (error) {
    request.log.error({ error }, 'Create retention policy error');

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('validation failed') || errorMessage.includes('must be at least')) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: errorMessage,
      });
    }

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create retention policy',
    });
  }
}

/**
 * List all retention policies
 */
export async function listRetentionPolicies(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { category, isActive } = request.query as {
      category?: DataCategory;
      isActive?: string;
    };

    const filter: any = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const policies = await retentionPolicyService.listPolicies(filter);

    return reply.status(200).send({
      success: true,
      data: policies,
    });
  } catch (error) {
    request.log.error({ error }, 'List retention policies error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve retention policies',
    });
  }
}

/**
 * Get retention policy by ID
 */
export async function getRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const policy = await retentionPolicyService.getPolicyById(id);

    if (!policy) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Retention policy not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: policy,
    });
  } catch (error) {
    request.log.error({ error }, 'Get retention policy error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve retention policy',
    });
  }
}

/**
 * Get active retention policy for a category
 */
export async function getActiveRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { category } = request.params as { category: DataCategory };

    const policy = await retentionPolicyService.getActivePolicy(category);

    if (!policy) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: `No active retention policy found for category: ${category}`,
      });
    }

    return reply.status(200).send({
      success: true,
      data: policy,
    });
  } catch (error) {
    request.log.error({ error }, 'Get active retention policy error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve active retention policy',
    });
  }
}

/**
 * Update retention policy (SuperAdmin only)
 */
export async function updateRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const updates = request.body as any;

    const policy = await retentionPolicyService.updatePolicy(id, updates);

    if (!policy) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Retention policy not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: policy,
    });
  } catch (error) {
    request.log.error({ error }, 'Update retention policy error');

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('not found')) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: errorMessage,
      });
    }

    if (errorMessage.includes('validation failed') || errorMessage.includes('must be at least')) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: errorMessage,
      });
    }

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update retention policy',
    });
  }
}

/**
 * Delete retention policy (SuperAdmin only)
 */
export async function deleteRetentionPolicy(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const deleted = await retentionPolicyService.deletePolicy(id);

    if (!deleted) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Retention policy not found',
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Retention policy deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Delete retention policy error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete retention policy',
    });
  }
}

/**
 * Get retention statistics for a category
 */
export async function getRetentionStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { category } = request.params as { category: DataCategory };

    const stats = await retentionPolicyService.getRetentionStats(category);

    return reply.status(200).send({
      success: true,
      data: stats ?? {
        policy: null,
        hotStorageDays: 0,
        warmStorageDays: 0,
        coldStorageDays: 0,
        totalRetentionDays: 0,
        archiveEnabled: false,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Get retention stats error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve retention statistics',
    });
  }
}
