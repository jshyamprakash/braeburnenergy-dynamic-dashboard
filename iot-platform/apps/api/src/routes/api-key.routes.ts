import { FastifyInstance } from 'fastify';
import * as apiKeyController from '../controllers/api-key.controller';
import { requireAuth } from '../middleware/auth.middleware';

/**
 * API Key Routes
 *
 * Manages API keys for machine-to-machine authentication.
 */

export async function apiKeyRoutes(fastify: FastifyInstance) {
  /**
   * POST /api-keys
   * Create new API key
   */
  fastify.post(
    '/api-keys',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Create new API key',
        description: 'Generate a new API key for machine-to-machine authentication. The plain-text key is only shown once.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 3,
              maxLength: 100,
              description: 'Friendly name for the API key (e.g., "Production Server")'
            },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Permissions granted to this key (e.g., ["device:read", "device-state:read"])',
              default: ['device:read', 'device-state:read'],
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Optional expiration date (ISO 8601 format)',
            },
            prefix: {
              type: 'string',
              enum: ['iot_live_', 'iot_test_'],
              description: 'Key prefix (iot_live_ for production, iot_test_ for development)',
              default: 'iot_test_',
            },
          },
        },
        response: {
          201: {
            description: 'API key created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  key: {
                    type: 'string',
                    description: 'Plain-text API key - SAVE THIS! It will not be shown again.',
                    example: 'iot_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6',
                  },
                  prefix: { type: 'string', enum: ['iot_live_', 'iot_test_'] },
                  permissions: { type: 'array', items: { type: 'string' } },
                  expiresAt: { type: 'string', format: 'date-time', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              message: { type: 'string' },
            },
          },
          400: {
            description: 'Validation error',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    apiKeyController.create
  );

  /**
   * GET /api-keys
   * List user's API keys
   */
  fastify.get(
    '/api-keys',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'List API keys',
        description: 'List all API keys for the authenticated user. Does not return plain-text keys.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'API keys retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    prefix: { type: 'string' },
                    permissions: { type: 'array', items: { type: 'string' } },
                    expiresAt: { type: 'string', format: 'date-time', nullable: true },
                    lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    apiKeyController.list
  );

  /**
   * GET /api-keys/:id
   * Get API key by ID
   */
  fastify.get(
    '/api-keys/:id',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Get API key details',
        description: 'Retrieve details of a specific API key. Does not return plain-text key.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'API key ID' },
          },
        },
        response: {
          200: {
            description: 'API key retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  prefix: { type: 'string' },
                  permissions: { type: 'array', items: { type: 'string' } },
                  expiresAt: { type: 'string', format: 'date-time', nullable: true },
                  lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          404: {
            description: 'API key not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    apiKeyController.getOne
  );

  /**
   * PATCH /api-keys/:id
   * Update API key
   */
  fastify.patch(
    '/api-keys/:id',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Update API key',
        description: 'Update API key name, permissions, or expiration. Cannot change the key itself (use rotate instead).',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'API key ID' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 100 },
            permissions: {
              type: 'array',
              items: { type: 'string' },
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        response: {
          200: {
            description: 'API key updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  prefix: { type: 'string' },
                  permissions: { type: 'array', items: { type: 'string' } },
                  expiresAt: { type: 'string', format: 'date-time', nullable: true },
                  lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
                  isActive: { type: 'boolean' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'API key not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    apiKeyController.update
  );

  /**
   * POST /api-keys/:id/revoke
   * Revoke API key
   */
  fastify.post(
    '/api-keys/:id/revoke',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Revoke API key',
        description: 'Revoke (deactivate) an API key. The key will no longer work but record is kept for audit.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'API key ID' },
          },
        },
        response: {
          200: {
            description: 'API key revoked successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'API key not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    apiKeyController.revoke
  );

  /**
   * DELETE /api-keys/:id
   * Delete API key permanently
   */
  fastify.delete(
    '/api-keys/:id',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Delete API key',
        description: 'Permanently delete an API key. This action cannot be undone.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'API key ID' },
          },
        },
        response: {
          200: {
            description: 'API key deleted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'API key not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    apiKeyController.deleteKey
  );

  /**
   * POST /api-keys/:id/rotate
   * Rotate API key
   */
  fastify.post(
    '/api-keys/:id/rotate',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Rotate API key',
        description: 'Generate a new key value while keeping the same ID, name, and permissions. Old key is invalidated.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'API key ID' },
          },
        },
        response: {
          200: {
            description: 'API key rotated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  key: {
                    type: 'string',
                    description: 'New plain-text API key - SAVE THIS! It will not be shown again.',
                  },
                  prefix: { type: 'string' },
                  permissions: { type: 'array', items: { type: 'string' } },
                  expiresAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'API key not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    apiKeyController.rotate
  );
}
