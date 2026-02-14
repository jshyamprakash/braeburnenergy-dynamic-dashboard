import { FastifyInstance } from 'fastify';
import * as auditLogController from '../controllers/audit-log.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

/**
 * Audit Log Routes
 *
 * EPA-compliant audit trail query and export endpoints.
 * All audit logs are read-only (append-only collection).
 */

export async function auditLogRoutes(fastify: FastifyInstance) {
  /**
   * GET /audit-logs
   * List audit logs with filtering and pagination
   */
  fastify.get(
    '/audit-logs',
    {
      schema: {
        tags: ['Audit Logs'],
        summary: 'List audit logs',
        description: 'Query audit logs with filtering, sorting, and pagination (SuperAdmin and Admin only)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Filter by user ID' },
            username: { type: 'string', description: 'Filter by username (partial match)' },
            action: {
              type: 'string',
              enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT'],
              description: 'Filter by action type',
            },
            resource: { type: 'string', description: 'Filter by resource type (Device, DeviceState, etc.)' },
            resourceId: { type: 'string', description: 'Filter by resource ID' },
            startDate: { type: 'string', format: 'date-time', description: 'Start date (ISO 8601)' },
            endDate: { type: 'string', format: 'date-time', description: 'End date (ISO 8601)' },
            success: { type: 'string', enum: ['true', 'false'], description: 'Filter by success status' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            description: 'Audit logs retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    userId: { type: 'string' },
                    username: { type: 'string' },
                    action: { type: 'string' },
                    resource: { type: 'string' },
                    resourceId: { type: 'string', nullable: true },
                    timestamp: { type: 'string', format: 'date-time' },
                    success: { type: 'boolean' },
                    errorMessage: { type: 'string', nullable: true },
                    metadata: {
                      type: 'object',
                      nullable: true,
                      additionalProperties: true,
                    },
                    changes: {
                      type: 'object',
                      nullable: true,
                      additionalProperties: true,
                    },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('audit-log:read')],
    },
    auditLogController.listAuditLogs
  );

  /**
   * GET /audit-logs/:id
   * Get audit log by ID
   */
  fastify.get(
    '/audit-logs/:id',
    {
      schema: {
        tags: ['Audit Logs'],
        summary: 'Get audit log by ID',
        description: 'Retrieve specific audit log entry (SuperAdmin and Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Audit log ID' },
          },
        },
        response: {
          200: {
            description: 'Audit log retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
          404: {
            description: 'Audit log not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('audit-log:read')],
    },
    auditLogController.getAuditLog
  );

  /**
   * GET /audit-logs/resource/:resource/:resourceId
   * Get audit trail for a specific resource
   */
  fastify.get(
    '/audit-logs/resource/:resource/:resourceId',
    {
      schema: {
        tags: ['Audit Logs'],
        summary: 'Get audit trail for resource',
        description: 'Retrieve complete audit trail for a specific resource (SuperAdmin and Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['resource', 'resourceId'],
          properties: {
            resource: { type: 'string', description: 'Resource type (Device, DeviceState, etc.)' },
            resourceId: { type: 'string', description: 'Resource ID' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            description: 'Audit trail retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('audit-log:read')],
    },
    auditLogController.getResourceAuditTrail
  );

  /**
   * GET /audit-logs/export
   * Export audit logs to CSV
   */
  fastify.get(
    '/audit-logs/export',
    {
      schema: {
        tags: ['Audit Logs'],
        summary: 'Export audit logs to CSV',
        description: 'Download audit logs as CSV file (SuperAdmin and Admin only, max 10,000 records)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time', description: 'Start date (ISO 8601)' },
            endDate: { type: 'string', format: 'date-time', description: 'End date (ISO 8601)' },
          },
        },
        response: {
          200: {
            description: 'CSV file download',
            type: 'string',
          },
        },
      },
      preHandler: [requireAuth, requirePermission('audit-log:export')],
    },
    auditLogController.exportAuditLogs
  );

  /**
   * GET /audit-logs/statistics
   * Get audit log statistics
   */
  fastify.get(
    '/audit-logs/statistics',
    {
      schema: {
        tags: ['Audit Logs'],
        summary: 'Get audit log statistics',
        description: 'Retrieve aggregated audit log statistics (SuperAdmin and Admin only)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time', description: 'Start date (ISO 8601)' },
            endDate: { type: 'string', format: 'date-time', description: 'End date (ISO 8601)' },
          },
        },
        response: {
          200: {
            description: 'Statistics retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  byAction: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        count: { type: 'integer' },
                      },
                    },
                  },
                  byResource: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        count: { type: 'integer' },
                      },
                    },
                  },
                  bySuccess: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'boolean' },
                        count: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('audit-log:read')],
    },
    auditLogController.getAuditStatistics
  );
}
