import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/rbac.middleware';
import { getModules, updateModules } from '../controllers/module.controller';

/**
 * Module Routes (ADR-051)
 *
 * GET  /api/v1/modules — public, no auth
 * PATCH /api/v1/modules — SuperAdmin only
 */
export async function moduleRoutes(fastify: FastifyInstance) {
  // GET /modules — public
  fastify.get('/modules', {
    schema: {
      tags: ['Modules'],
      summary: 'Get enabled modules',
      description:
        'Returns list of currently enabled optional module identifiers. ' +
        'No authentication required. Frontend reads on init to gate module UI (ADR-051).',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                enabled: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  }, getModules);

  // PATCH /modules — SuperAdmin only
  fastify.patch('/modules', {
    preHandler: [requireAuth, requireSuperAdmin],
    schema: {
      tags: ['Modules'],
      summary: 'Update enabled modules (SuperAdmin only)',
      description:
        'Replaces the enabled[] list. SuperAdmin JWT required. ' +
        'Valid values: combustion_dl, asset_life, be_agent.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['enabled'],
        properties: {
          enabled: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['combustion_dl', 'asset_life', 'be_agent'],
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                enabled: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  }, updateModules);
}
