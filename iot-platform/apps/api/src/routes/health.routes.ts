import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { getSystemHealth } from '../services/system-health.service.js';

/**
 * Health Check Routes
 *
 * Provides health and readiness endpoints for monitoring
 */
export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health
   * Basic health check - returns 200 if server is running
   */
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Basic health check',
      description: 'Returns server status, uptime, and timestamp. Always returns 200 if server is running.',
      response: {
        200: {
          description: 'Server is healthy',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', description: 'Server uptime in seconds', example: 123.456 },
            service: { type: 'string', example: 'iot-platform-api' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'iot-platform-api',
    });
  });

  /**
   * GET /health/ready
   * Readiness check - verifies database connectivity
   */
  fastify.get('/health/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness check',
      description: 'Verifies database connectivity. Use for Kubernetes readiness probes and load balancer health checks.',
      response: {
        200: {
          description: 'Server is ready (database connected)',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ready' },
            timestamp: { type: 'string', format: 'date-time' },
            database: { type: 'string', example: 'connected' },
          },
        },
        503: {
          description: 'Server is not ready (database disconnected)',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'not ready' },
            timestamp: { type: 'string', format: 'date-time' },
            database: { type: 'string', example: 'disconnected' },
            error: { type: 'string', example: 'Connection timeout' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check database connection
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      await db.admin().ping();

      return reply.code(200).send({
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (error) {
      request.log.error(error, 'Database health check failed');

      return reply.code(503).send({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /health/system
   * Infrastructure health — NATS, Redis, BullMQ, MongoDB, gateway counts (ADR-057)
   * Requires Admin or SuperAdmin JWT.
   */
  fastify.get('/health/system', {
    preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      tags: ['Health'],
      summary: 'Infrastructure health (Admin+)',
      description:
        'Returns live status for NATS, Redis, BullMQ, MongoDB replica set, and gateway connection counts. ' +
        'Requires Admin or SuperAdmin JWT.',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'System health aggregated',
          type: 'object',
          additionalProperties: true,
          properties: {
            overall: { type: 'string', enum: ['green', 'amber', 'red'] },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const health = await getSystemHealth();
      return reply.code(200).send(health);
    } catch (err) {
      request.log.error(err, 'System health check error');
      return reply.code(500).send({
        overall: 'red',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /health/live
   * Liveness check - minimal check for Kubernetes liveness probe
   */
  fastify.get('/health/live', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness check',
      description: 'Minimal health check with no dependencies. Use for Kubernetes liveness probes and Docker HEALTHCHECK.',
      response: {
        200: {
          description: 'Server is alive',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'alive' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      status: 'alive',
    });
  });
}
