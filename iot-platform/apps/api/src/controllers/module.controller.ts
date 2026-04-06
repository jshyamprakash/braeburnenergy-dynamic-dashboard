import type { FastifyRequest, FastifyReply } from 'fastify';
import { moduleService } from '../services/module.service';
import type { LicenseModule } from '../models/module-config.model';

/**
 * GET /api/v1/modules
 * Public — no auth required.
 * Frontend reads on init to gate module-specific UI (ADR-051).
 */
export async function getModules(_request: FastifyRequest, reply: FastifyReply) {
  const data = await moduleService.getConfig();
  return reply.send({ success: true, data });
}

/**
 * PATCH /api/v1/modules
 * SuperAdmin only. Replaces the enabled[] list entirely.
 */
export async function updateModules(request: FastifyRequest, reply: FastifyReply) {
  const { enabled } = request.body as { enabled: LicenseModule[] };
  const data = await moduleService.setEnabled(enabled);
  return reply.send({ success: true, data });
}
