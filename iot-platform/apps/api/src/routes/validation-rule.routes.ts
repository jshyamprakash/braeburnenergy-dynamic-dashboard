import { FastifyInstance } from 'fastify';
import * as validationRuleController from '../controllers/validation-rule.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

/**
 * Validation Rule Routes
 *
 * EPA/AWWA-compliant data quality validation rule management.
 */

export async function validationRuleRoutes(fastify: FastifyInstance) {
  /**
   * POST /validation-rules
   * Create validation rule (Admin+)
   */
  fastify.post(
    '/validation-rules',
    {
      schema: {
        tags: ['Data Quality'],
        summary: 'Create validation rule',
        description: 'Create new data validation rule (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    validationRuleController.createValidationRule
  );

  /**
   * GET /validation-rules
   * List validation rules
   */
  fastify.get(
    '/validation-rules',
    {
      schema: {
        tags: ['Data Quality'],
        summary: 'List validation rules',
        description: 'List all validation rules with filtering',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    validationRuleController.listValidationRules
  );

  /**
   * GET /validation-rules/:id
   * Get validation rule by ID
   */
  fastify.get(
    '/validation-rules/:id',
    {
      schema: {
        tags: ['Data Quality'],
        summary: 'Get validation rule',
        description: 'Get specific validation rule by ID',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    validationRuleController.getValidationRule
  );

  /**
   * PATCH /validation-rules/:id
   * Update validation rule (Admin+)
   */
  fastify.patch(
    '/validation-rules/:id',
    {
      schema: {
        tags: ['Data Quality'],
        summary: 'Update validation rule',
        description: 'Update existing validation rule (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    validationRuleController.updateValidationRule
  );

  /**
   * DELETE /validation-rules/:id
   * Delete validation rule (Admin+)
   */
  fastify.delete(
    '/validation-rules/:id',
    {
      schema: {
        tags: ['Data Quality'],
        summary: 'Delete validation rule',
        description: 'Delete validation rule (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    validationRuleController.deleteValidationRule
  );

  /**
   * GET /quality/stats/:deviceId
   * Get quality statistics
   */
  fastify.get(
    '/quality/stats/:deviceId',
    {
      schema: {
        tags: ['Data Quality'],
        summary: 'Get quality statistics',
        description: 'Get data quality statistics for a device',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    validationRuleController.getQualityStats
  );

  /**
   * POST /quality/review/:stateId
   * Manual quality review (Admin+)
   */
  fastify.post(
    '/quality/review/:stateId',
    {
      schema: {
        tags: ['Data Quality'],
        summary: 'Manual quality review',
        description: 'Manually override quality status (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    validationRuleController.manualQualityReview
  );
}
