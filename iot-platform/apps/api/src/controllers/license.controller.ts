import type { FastifyRequest, FastifyReply } from 'fastify';
import { licenseService } from '../services/license.service';

/**
 * GET /api/v1/license
 * Public endpoint — no auth required.
 * Frontend reads this on app init to determine which modules are enabled.
 */
export async function getLicenseState(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ success: true, data: licenseService.getState() });
}
