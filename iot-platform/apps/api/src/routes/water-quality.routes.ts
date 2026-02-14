import { FastifyInstance } from 'fastify';
import * as waterQualityController from '../controllers/water-quality.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

/**
 * Water Quality Routes
 *
 * EPA/AWWA compliant water quality parameter management and validation.
 */

export async function waterQualityRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // Parameter Management
  // ============================================================================

  /**
   * POST /water-quality/parameters
   * Create water quality parameter (Admin+)
   */
  fastify.post(
    '/water-quality/parameters',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Create water quality parameter',
        description: 'Create new EPA/AWWA water quality parameter definition (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    waterQualityController.createParameter as any
  );

  /**
   * GET /water-quality/parameters
   * List water quality parameters
   */
  fastify.get(
    '/water-quality/parameters',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'List water quality parameters',
        description: 'List all EPA/AWWA water quality parameters with filtering',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    waterQualityController.listParameters as any
  );

  /**
   * GET /water-quality/parameters/:code
   * Get parameter by code
   */
  fastify.get(
    '/water-quality/parameters/:code',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Get water quality parameter',
        description: 'Get specific water quality parameter by code (e.g., PH, CL2_FREE)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    waterQualityController.getParameter as any
  );

  /**
   * PATCH /water-quality/parameters/:code
   * Update parameter (Admin+)
   */
  fastify.patch(
    '/water-quality/parameters/:code',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Update water quality parameter',
        description: 'Update EPA/AWWA water quality parameter definition (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    waterQualityController.updateParameter as any
  );

  /**
   * DELETE /water-quality/parameters/:code
   * Delete parameter (Admin+)
   */
  fastify.delete(
    '/water-quality/parameters/:code',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Delete water quality parameter',
        description: 'Delete water quality parameter definition (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    waterQualityController.deleteParameter as any
  );

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * POST /water-quality/validate
   * Validate water quality reading
   */
  fastify.post(
    '/water-quality/validate',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Validate water quality reading',
        description: 'Validate single water quality reading against EPA/AWWA standards',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    waterQualityController.validateReading as any
  );

  /**
   * POST /water-quality/validate-batch
   * Validate multiple readings
   */
  fastify.post(
    '/water-quality/validate-batch',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Validate multiple readings',
        description: 'Validate multiple water quality readings in batch',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    waterQualityController.validateBatchReadings as any
  );

  // ============================================================================
  // Compliance Reporting
  // ============================================================================

  /**
   * GET /water-quality/compliance/:deviceId
   * Generate compliance report
   */
  fastify.get(
    '/water-quality/compliance/:deviceId',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Generate compliance report',
        description: 'Generate EPA/AWWA compliance report for device over date range',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    waterQualityController.getComplianceReport as any
  );

  /**
   * GET /water-quality/sampling-requirements
   * Get sampling requirements
   */
  fastify.get(
    '/water-quality/sampling-requirements',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Get sampling requirements',
        description: 'Get EPA sampling frequency and method requirements',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    waterQualityController.getSamplingRequirements as any
  );

  // ============================================================================
  // Seeding
  // ============================================================================

  /**
   * POST /water-quality/seed
   * Seed default parameters (Admin+)
   */
  fastify.post(
    '/water-quality/seed',
    {
      schema: {
        tags: ['Water Quality'],
        summary: 'Seed default parameters',
        description: 'Seed default EPA/AWWA water quality parameters (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    waterQualityController.seedDefaultParameters as any
  );
}
