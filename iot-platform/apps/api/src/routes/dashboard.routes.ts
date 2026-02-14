import type { FastifyInstance } from 'fastify';
import {
  getDashboard,
  getUserDashboards,
  saveDashboard,
  deleteDashboard,
  shareDashboard,
  getSharedDashboards,
} from '../controllers/dashboard.controller';
import { successResponse, errorResponse } from '../utils/swagger';

/**
 * Dashboard Routes
 *
 * Registers dashboard-related HTTP endpoints for hybrid storage mode
 * (localStorage cache + backend persistence for cross-device sync)
 */
export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get user's dashboards
  fastify.get('/dashboards', {
    schema: {
      tags: ['Dashboards'],
      summary: 'Get all user dashboards',
      description: 'Returns all dashboards created by the authenticated user',
      security: [{ bearerAuth: [] }],
      response: {
        200: successResponse(
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                userId: { type: 'string' },
                organizationId: { type: 'string' },
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
                isShared: { type: 'boolean' },
                sharedWith: { type: 'array', items: { type: 'string' } },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          'User dashboards retrieved successfully'
        ),
      },
    },
  }, getUserDashboards);

  // Get specific dashboard by ID
  fastify.get('/dashboards/:dashboardId', {
    schema: {
      tags: ['Dashboards'],
      summary: 'Get dashboard by ID',
      description: 'Retrieves a specific dashboard configuration',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          dashboardId: { type: 'string', description: 'Dashboard identifier' },
        },
        required: ['dashboardId'],
      },
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              organizationId: { type: 'string' },
              dashboardId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              blocks: { type: 'array', items: { type: 'object', additionalProperties: true } },
              layouts: { type: 'object', additionalProperties: true },
              isShared: { type: 'boolean' },
              sharedWith: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Dashboard retrieved successfully'
        ),
        404: errorResponse('Dashboard not found'),
      },
    },
  }, getDashboard);

  // Save dashboard (create or update)
  fastify.post('/dashboards', {
    schema: {
      tags: ['Dashboards'],
      summary: 'Save dashboard',
      description: 'Creates a new dashboard or updates an existing one (upsert operation). Used for cross-device sync.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          dashboardId: { type: 'string', description: 'Dashboard identifier' },
          organizationId: { type: 'string', description: 'Organization ID' },
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
        required: ['dashboardId', 'organizationId', 'blocks', 'layouts'],
      },
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              organizationId: { type: 'string' },
              dashboardId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              blocks: { type: 'array', items: { type: 'object', additionalProperties: true } },
              layouts: { type: 'object', additionalProperties: true },
              isShared: { type: 'boolean' },
              sharedWith: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Dashboard saved successfully'
        ),
        400: errorResponse('Validation error'),
      },
    },
  }, saveDashboard);

  // Delete dashboard
  fastify.delete('/dashboards/:dashboardId', {
    schema: {
      tags: ['Dashboards'],
      summary: 'Delete dashboard',
      description: 'Permanently deletes a dashboard',
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

  // Share dashboard with other users
  fastify.post('/dashboards/:dashboardId/share', {
    schema: {
      tags: ['Dashboards'],
      summary: 'Share dashboard',
      description: 'Share a dashboard with other users (multi-user collaboration)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          dashboardId: { type: 'string', description: 'Dashboard identifier' },
        },
        required: ['dashboardId'],
      },
      body: {
        type: 'object',
        properties: {
          sharedWith: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of user IDs to share with',
          },
        },
        required: ['sharedWith'],
      },
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              dashboardId: { type: 'string' },
              isShared: { type: 'boolean', example: true },
              sharedWith: { type: 'array', items: { type: 'string' } },
            },
          },
          'Dashboard shared successfully'
        ),
        404: errorResponse('Dashboard not found'),
      },
    },
  }, shareDashboard);

  // Get shared dashboards
  fastify.get('/dashboards/shared/all', {
    schema: {
      tags: ['Dashboards'],
      summary: 'Get shared dashboards',
      description: 'Returns all dashboards that have been shared with the authenticated user',
      security: [{ bearerAuth: [] }],
      response: {
        200: successResponse(
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                userId: { type: 'string', description: 'Original owner' },
                organizationId: { type: 'string' },
                dashboardId: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                blocks: { type: 'array', items: { type: 'object', additionalProperties: true } },
                layouts: { type: 'object', additionalProperties: true },
                isShared: { type: 'boolean', example: true },
                sharedWith: { type: 'array', items: { type: 'string' } },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          'Shared dashboards retrieved successfully'
        ),
      },
    },
  }, getSharedDashboards);
}
