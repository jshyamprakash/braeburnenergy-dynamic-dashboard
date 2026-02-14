import { FastifyInstance } from 'fastify';
import * as retentionPolicyController from '../controllers/retention-policy.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

/**
 * Retention Policy Routes
 *
 * EPA-compliant data retention policy management endpoints.
 */

export async function retentionPolicyRoutes(fastify: FastifyInstance) {
  /**
   * POST /retention-policies
   * Create a new retention policy (SuperAdmin only)
   */
  fastify.post(
    '/retention-policies',
    {
      schema: {
        tags: ['Retention Policies'],
        summary: 'Create retention policy',
        description: 'Create a new data retention policy (SuperAdmin only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'category'],
          properties: {
            name: { type: 'string', maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            category: {
              type: 'string',
              enum: ['device_states', 'audit_logs', 'alarms', 'calibration_records'],
            },
            hotStorageDuration: { type: 'number', minimum: 0, description: 'Hot storage duration in seconds (e.g., 7776000 for 90 days)' },
            warmStorageDuration: { type: 'number', minimum: 0, description: 'Warm storage duration in seconds (e.g., 31536000 for 1 year)' },
            coldStorageDuration: { type: 'number', minimum: 0, description: 'Cold storage duration in seconds (e.g., 157680000 for 5 years)' },
            totalRetentionDuration: { type: 'number', minimum: 0, description: 'Total retention before deletion (seconds, 0 = permanent)' },
            archiveEnabled: { type: 'boolean' },
            archiveDestination: { type: 'string', maxLength: 500 },
            compressionEnabled: { type: 'boolean' },
            compressionThreshold: { type: 'number', minimum: 0, description: 'Days after which to compress' },
            regulatoryRequirement: { type: 'string', maxLength: 200 },
            minimumRetentionDays: { type: 'number', minimum: 0, description: 'Legal minimum retention in days' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          201: {
            description: 'Retention policy created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      preHandler: [requireAuth, requireRole('SuperAdmin')],
    },
    retentionPolicyController.createRetentionPolicy
  );

  /**
   * GET /retention-policies
   * List all retention policies
   */
  fastify.get(
    '/retention-policies',
    {
      schema: {
        tags: ['Retention Policies'],
        summary: 'List retention policies',
        description: 'List all data retention policies (SuperAdmin and Admin)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['device_states', 'audit_logs', 'alarms', 'calibration_records'],
              description: 'Filter by category',
            },
            isActive: {
              type: 'string',
              enum: ['true', 'false'],
              description: 'Filter by active status',
            },
          },
        },
        response: {
          200: {
            description: 'Retention policies retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    retentionPolicyController.listRetentionPolicies
  );

  /**
   * GET /retention-policies/:id
   * Get retention policy by ID
   */
  fastify.get(
    '/retention-policies/:id',
    {
      schema: {
        tags: ['Retention Policies'],
        summary: 'Get retention policy by ID',
        description: 'Retrieve specific retention policy (SuperAdmin and Admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Retention policy ID' },
          },
        },
        response: {
          200: {
            description: 'Retention policy retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object', additionalProperties: true },
            },
          },
          404: {
            description: 'Retention policy not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    retentionPolicyController.getRetentionPolicy
  );

  /**
   * GET /retention-policies/active/:category
   * Get active retention policy for a category
   */
  fastify.get(
    '/retention-policies/active/:category',
    {
      schema: {
        tags: ['Retention Policies'],
        summary: 'Get active retention policy',
        description: 'Get active retention policy for a data category (SuperAdmin and Admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['category'],
          properties: {
            category: {
              type: 'string',
              enum: ['device_states', 'audit_logs', 'alarms', 'calibration_records'],
            },
          },
        },
        response: {
          200: {
            description: 'Active retention policy retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object', additionalProperties: true },
            },
          },
          404: {
            description: 'No active retention policy found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    retentionPolicyController.getActiveRetentionPolicy
  );

  /**
   * PATCH /retention-policies/:id
   * Update retention policy (SuperAdmin only)
   */
  fastify.patch(
    '/retention-policies/:id',
    {
      schema: {
        tags: ['Retention Policies'],
        summary: 'Update retention policy',
        description: 'Update existing retention policy (SuperAdmin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Retention policy ID' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            hotStorageDuration: { type: 'number', minimum: 0 },
            warmStorageDuration: { type: 'number', minimum: 0 },
            coldStorageDuration: { type: 'number', minimum: 0 },
            totalRetentionDuration: { type: 'number', minimum: 0 },
            archiveEnabled: { type: 'boolean' },
            archiveDestination: { type: 'string', maxLength: 500 },
            compressionEnabled: { type: 'boolean' },
            compressionThreshold: { type: 'number', minimum: 0 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Retention policy updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object', additionalProperties: true },
            },
          },
          404: {
            description: 'Retention policy not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requireRole('SuperAdmin')],
    },
    retentionPolicyController.updateRetentionPolicy
  );

  /**
   * DELETE /retention-policies/:id
   * Delete retention policy (SuperAdmin only)
   */
  fastify.delete(
    '/retention-policies/:id',
    {
      schema: {
        tags: ['Retention Policies'],
        summary: 'Delete retention policy',
        description: 'Delete retention policy (SuperAdmin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Retention policy ID' },
          },
        },
        response: {
          200: {
            description: 'Retention policy deleted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'Retention policy not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requireRole('SuperAdmin')],
    },
    retentionPolicyController.deleteRetentionPolicy
  );

  /**
   * GET /retention-policies/stats/:category
   * Get retention statistics for a category
   */
  fastify.get(
    '/retention-policies/stats/:category',
    {
      schema: {
        tags: ['Retention Policies'],
        summary: 'Get retention statistics',
        description: 'Get retention statistics for a data category (SuperAdmin and Admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['category'],
          properties: {
            category: {
              type: 'string',
              enum: ['device_states', 'audit_logs', 'alarms', 'calibration_records'],
            },
          },
        },
        response: {
          200: {
            description: 'Retention statistics retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  policy: { type: 'object', additionalProperties: true },
                  hotStorageDays: { type: 'number' },
                  warmStorageDays: { type: 'number' },
                  coldStorageDays: { type: 'number' },
                  totalRetentionDays: { type: 'number' },
                  archiveEnabled: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    retentionPolicyController.getRetentionStats
  );
}
