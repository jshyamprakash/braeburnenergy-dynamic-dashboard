/**
 * Module Middleware (ADR-058)
 *
 * Factory that creates a preHandler which gates a route behind a licensed module.
 * Dev override: NODE_ENV=development → always pass (mirrors frontend licenseSlice behaviour).
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { moduleService } from '../services/module.service.js';

export function requireModule(moduleName: string) {
  return async (_request: FastifyRequest, reply: FastifyReply) => {
    // Dev override — all modules enabled in development (mirrors ADR-048 frontend behaviour)
    if (process.env.NODE_ENV === 'development') return;

    const { enabled } = await moduleService.getConfig();

    if (!enabled.includes(moduleName as any)) {
      return reply.status(403).send({
        success: false,
        error: 'Module not enabled',
        message: `The '${moduleName}' module is not enabled on this platform.`,
      });
    }
  };
}
