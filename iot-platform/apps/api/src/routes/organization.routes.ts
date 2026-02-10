import type { FastifyInstance } from 'fastify';
import { organizationController } from '../controllers/organization.controller';

export async function organizationRoutes(fastify: FastifyInstance) {
  // Create organization
  fastify.post(
    '/organizations',
    {
      schema: {
        description: 'Create a new organization',
        tags: ['organizations'],
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
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
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
    },
    organizationController.create.bind(organizationController)
  );

  // List organizations
  fastify.get(
    '/organizations',
    {
      schema: {
        description: 'List all organizations',
        tags: ['organizations'],
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
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    settings: { type: 'object', additionalProperties: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
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
    },
    organizationController.list.bind(organizationController)
  );

  // Get organization by ID
  fastify.get(
    '/organizations/:orgId',
    {
      schema: {
        description: 'Get organization by ID',
        tags: ['organizations'],
        params: {
          type: 'object',
          required: ['orgId'],
          properties: {
            orgId: { type: 'string', format: 'uuid', description: 'Organization UUID' },
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
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
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
    },
    organizationController.getById.bind(organizationController)
  );

  // Get organization by slug
  fastify.get(
    '/organizations/slug/:slug',
    {
      schema: {
        description: 'Get organization by slug',
        tags: ['organizations'],
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
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
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
    },
    organizationController.getBySlug.bind(organizationController)
  );

  // Update organization
  fastify.patch(
    '/organizations/:orgId',
    {
      schema: {
        description: 'Update organization',
        tags: ['organizations'],
        params: {
          type: 'object',
          required: ['orgId'],
          properties: {
            orgId: { type: 'string', format: 'uuid', description: 'Organization UUID' },
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
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
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
    },
    organizationController.update.bind(organizationController)
  );

  // Delete organization
  fastify.delete(
    '/organizations/:orgId',
    {
      schema: {
        description: 'Delete organization (cascade deletes devices and states)',
        tags: ['organizations'],
        params: {
          type: 'object',
          required: ['orgId'],
          properties: {
            orgId: { type: 'string', format: 'uuid', description: 'Organization UUID' },
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
    },
    organizationController.delete.bind(organizationController)
  );

  // Get organization statistics
  fastify.get(
    '/organizations/:orgId/stats',
    {
      schema: {
        description: 'Get organization statistics (device count, state count)',
        tags: ['organizations'],
        params: {
          type: 'object',
          required: ['orgId'],
          properties: {
            orgId: { type: 'string', format: 'uuid', description: 'Organization UUID' },
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
    },
    organizationController.getStats.bind(organizationController)
  );
}
