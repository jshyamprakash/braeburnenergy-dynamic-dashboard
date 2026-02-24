import type { FastifyInstance } from 'fastify';
import { organizationController } from '../controllers/organization.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

export async function organizationRoutes(fastify: FastifyInstance) {
  // Create organization
  fastify.post(
    '/organizations',
    {
      schema: {
        description: 'Create a new organization (SuperAdmin only)',
        tags: ['organizations'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'slug'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255, description: 'Organization name' },
            slug: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              pattern: '^[a-z0-9-]+$',
              description: 'URL-friendly identifier',
            },
            settings: { type: 'object', description: 'Organization settings' },
          },
        },
        response: {
          201: {
            description: 'Organization created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
                additionalProperties: true,
              },
            },
          },
          409: {
            description: 'Organization slug already exists',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('organization:create')],
    },
    organizationController.create.bind(organizationController)
  );

  // List organizations
  fastify.get(
    '/organizations',
    {
      schema: {
        description: 'List all organizations (SuperAdmin and Admin only)',
        tags: ['organizations'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Maximum results' },
            offset: { type: 'integer', minimum: 0, default: 0, description: 'Results to skip' },
            search: { type: 'string', description: 'Search by name or slug' },
          },
        },
        response: {
          200: {
            description: 'Organizations retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    id: { type: 'string' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    settings: { type: 'object', additionalProperties: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                  additionalProperties: true,
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  limit: { type: 'integer' },
                  offset: { type: 'integer' },
                  total: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('organization:read')],
    },
    organizationController.list.bind(organizationController)
  );

  // Get organization by ID
  fastify.get(
    '/organizations/:orgId',
    {
      schema: {
        description: 'Get organization by ID (SuperAdmin and Admin only)',
        tags: ['organizations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['orgId'],
          properties: {
            orgId: { type: 'string', description: 'Organization ID' },
          },
        },
        response: {
          200: {
            description: 'Organization retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
                additionalProperties: true,
              },
            },
          },
          404: {
            description: 'Organization not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('organization:read')],
    },
    organizationController.getById.bind(organizationController)
  );

  // Get organization by slug
  fastify.get(
    '/organizations/slug/:slug',
    {
      schema: {
        description: 'Get organization by slug (SuperAdmin and Admin only)',
        tags: ['organizations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string', description: 'Organization slug' },
          },
        },
        response: {
          200: {
            description: 'Organization retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
                additionalProperties: true,
              },
            },
          },
          404: {
            description: 'Organization not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('organization:read')],
    },
    organizationController.getBySlug.bind(organizationController)
  );

  // Update organization
  fastify.patch(
    '/organizations/:orgId',
    {
      schema: {
        description: 'Update organization (SuperAdmin only)',
        tags: ['organizations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['orgId'],
          properties: {
            orgId: { type: 'string', description: 'Organization ID' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255, description: 'Organization name' },
            slug: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              pattern: '^[a-z0-9-]+$',
              description: 'URL-friendly identifier',
            },
            settings: { type: 'object', description: 'Organization settings' },
          },
        },
        response: {
          200: {
            description: 'Organization updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
                additionalProperties: true,
              },
            },
          },
          404: {
            description: 'Organization not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          409: {
            description: 'Organization slug already exists',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('organization:update')],
    },
    organizationController.update.bind(organizationController)
  );

  // Delete organization
  fastify.delete(
    '/organizations/:orgId',
    {
      schema: {
        description: 'Delete organization (cascade deletes devices and states) - SuperAdmin only',
        tags: ['organizations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['orgId'],
          properties: {
            orgId: { type: 'string', description: 'Organization ID' },
          },
        },
        response: {
          200: {
            description: 'Organization deleted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'Organization not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('organization:delete')],
    },
    organizationController.delete.bind(organizationController)
  );

  // Get organization statistics
  fastify.get(
    '/organizations/:orgId/stats',
    {
      schema: {
        description: 'Get organization statistics (device count, state count) - SuperAdmin and Admin only',
        tags: ['organizations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['orgId'],
          properties: {
            orgId: { type: 'string', description: 'Organization ID' },
          },
        },
        response: {
          200: {
            description: 'Statistics retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  deviceCount: { type: 'integer' },
                  stateCount: { type: 'integer' },
                },
              },
            },
          },
          404: {
            description: 'Organization not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('organization:read')],
    },
    organizationController.getStats.bind(organizationController)
  );
}
