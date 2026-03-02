import type { FastifyInstance } from 'fastify';
import {
  getDashboard,
  getUserDashboards,
  saveDashboard,
  deleteDashboard,
} from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { successResponse, errorResponse } from '../utils/swagger';

const dashboardSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    orgId: { type: 'string' },
    applicationId: { type: 'string' },
    dashboardId: { type: 'string', example: 'default' },
    name: { type: 'string', example: 'My Dashboard' },
    description: { type: 'string', example: 'Main monitoring dashboard' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['gauge', 'chart', 'liveStream'] },
          layouts: { type: 'object', additionalProperties: true },
          config: { type: 'object', additionalProperties: true },
        },
      },
    },
    layouts: { type: 'object', additionalProperties: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

/**
 * Dashboard Routes
 *
 * All routes require auth. Dashboards are scoped to orgId + applicationId (ADR-038).
 */
export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboards for an application
  fastify.get('/dashboards', {
    preHandler: requireAuth,
    schema: {
      tags: ['Dashboards'],
      summary: 'Get dashboards for an application',
      description: 'Returns all dashboards scoped to the authenticated org and application',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'Application ID (required)' },
        },
        required: ['applicationId'],
      },
      response: {
        200: successResponse({ type: 'array', items: dashboardSchema }, 'Dashboards retrieved successfully'),
      },
    },
  }, getUserDashboards);

  // Get specific dashboard by ID
  fastify.get('/dashboards/:dashboardId', {
    preHandler: requireAuth,
    schema: {
      tags: ['Dashboards'],
      summary: 'Get dashboard by ID',
      description: 'Retrieves a specific dashboard scoped to org + application',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          dashboardId: { type: 'string', description: 'Dashboard identifier' },
        },
        required: ['dashboardId'],
      },
      querystring: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'Application ID (required)' },
        },
        required: ['applicationId'],
      },
      response: {
        200: successResponse(dashboardSchema, 'Dashboard retrieved successfully'),
        404: errorResponse('Dashboard not found'),
      },
    },
  }, getDashboard);

  // Save dashboard (create or update)
  fastify.post('/dashboards', {
    preHandler: requireAuth,
    schema: {
      tags: ['Dashboards'],
      summary: 'Save dashboard',
      description: 'Creates a new dashboard or updates an existing one (upsert). orgId comes from JWT.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          dashboardId: { type: 'string', description: 'Dashboard identifier' },
          applicationId: { type: 'string', description: 'Application ID' },
          name: { type: 'string', description: 'Dashboard name' },
          description: { type: 'string', description: 'Dashboard description' },
          blocks: {
            type: 'array',
            description: 'Dashboard blocks configuration',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['gauge', 'chart', 'liveStream'] },
                layouts: { type: 'object', additionalProperties: true },
                config: { type: 'object', additionalProperties: true },
              },
              required: ['id', 'type', 'layouts', 'config'],
            },
          },
          layouts: {
            type: 'object',
            description: 'Responsive layouts (lg, md, sm)',
            additionalProperties: true,
          },
        },
        required: ['dashboardId', 'applicationId', 'blocks', 'layouts'],
      },
      response: {
        200: successResponse(dashboardSchema, 'Dashboard saved successfully'),
        400: errorResponse('Validation error'),
      },
    },
  }, saveDashboard);

  // Delete dashboard
  fastify.delete('/dashboards/:dashboardId', {
    preHandler: requireAuth,
    schema: {
      tags: ['Dashboards'],
      summary: 'Delete dashboard',
      description: 'Permanently deletes a dashboard scoped to the authenticated org',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          dashboardId: { type: 'string', description: 'Dashboard identifier' },
        },
        required: ['dashboardId'],
      },
      response: {
        200: {
          description: 'Dashboard deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Dashboard deleted successfully' },
          },
        },
        404: errorResponse('Dashboard not found'),
      },
    },
  }, deleteDashboard);
}
