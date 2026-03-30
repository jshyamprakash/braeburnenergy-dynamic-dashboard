import type { FastifyInstance } from 'fastify';
import { getLicenseState } from '../controllers/license.controller';

export async function licenseRoutes(fastify: FastifyInstance) {
  fastify.get('/license', {
    schema: {
      tags: ['License'],
      summary: 'Get license state',
      description:
        'Returns current license validity and enabled module list. No authentication required. ' +
        'Frontend reads this on init to gate module-specific UI (ADR-048).',
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
