import type { FastifyInstance } from 'fastify';
import { getLicenseState } from '../controllers/license.controller';

export async function licenseRoutes(fastify: FastifyInstance) {
  fastify.get('/license', {
    schema: {
      tags: ['License'],
      summary: '[DEPRECATED] Get license state',
      description:
        'DEPRECATED (ADR-051): Use GET /api/v1/modules instead. ' +
        'Returns current license validity and enabled module list. No authentication required.',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                valid: { type: 'boolean' },
                customer: { type: 'string' },
                modules: { type: 'array', items: { type: 'string' } },
                expiresAt: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
  }, getLicenseState);
}
