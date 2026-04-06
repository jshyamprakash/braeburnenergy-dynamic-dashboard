/**
 * BE Agent Routes (ADR-058)
 *
 * POST /be-agent/chat   — stream chat via Socket.io be-agent:token (be_agent module gate)
 * GET  /be-agent/config — get current AI config (Admin+)
 * PATCH /be-agent/config — update AI config via SystemConfig (Admin+)
 */
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { requireModule } from '../middleware/module.middleware.js';
import { beAgentChat } from '../services/be-agent.service.js';
import { SystemConfig } from '../models/system-config.model.js';

export async function beAgentRoutes(fastify: FastifyInstance) {
  /**
   * POST /be-agent/chat
   *
   * Accepts {message, requestId, deviceId?}.
   * Fire-and-forget: returns 202 immediately.
   * Client must subscribe to Socket.io room `be-agent:<requestId>` to receive token stream.
   */
  fastify.post('/be-agent/chat', {
    preHandler: [requireAuth, requireModule('be_agent')],
    schema: {
      tags: ['BE Agent'],
      summary: 'Send message to BE Agent (streams via Socket.io)',
      description:
        'Returns 202 immediately. Tokens stream via Socket.io event be-agent:token ' +
        'to the room be-agent:<requestId>. Subscribe before calling this endpoint. ' +
        'Gated behind the be_agent module.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['message', 'requestId'],
        properties: {
          message: { type: 'string', minLength: 1, maxLength: 2000 },
          requestId: { type: 'string', minLength: 1 },
          deviceId: { type: 'string' },
        },
      },
      response: {
        202: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            requestId: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { message, requestId, deviceId } = request.body as {
      message: string;
      requestId: string;
      deviceId?: string;
    };

    const io = fastify.io;

    // Fire-and-forget — streaming happens via Socket.io
    beAgentChat(message, requestId, io, deviceId).catch((err) => {
      fastify.log.error(err, 'BE Agent chat unhandled error');
      io.to(`be-agent:${requestId}`).emit('be-agent:token', {
        requestId,
        token: '',
        done: true,
        error: 'Internal chat error',
      });
    });

    return reply.code(202).send({ success: true, requestId });
  });

  /**
   * GET /be-agent/config
   * Returns current AI endpoint/model (API key is masked).
   */
  fastify.get('/be-agent/config', {
    preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      tags: ['BE Agent'],
      summary: 'Get BE Agent AI configuration (Admin+)',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                endpoint: { type: 'string' },
                model: { type: 'string' },
                apiKeySet: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const [epDoc, keyDoc, modelDoc] = await Promise.all([
      SystemConfig.findById('be_agent_endpoint').lean(),
      SystemConfig.findById('be_agent_api_key').lean(),
      SystemConfig.findById('be_agent_model').lean(),
    ]);

    return reply.send({
      success: true,
      data: {
        endpoint: epDoc?.value ?? '',
        model: modelDoc?.value ?? '',
        apiKeySet: !!(keyDoc?.value),
      },
    });
  });

  /**
   * PATCH /be-agent/config
   * Stores AI config in SystemConfig (overrides env vars at runtime).
   */
  fastify.patch('/be-agent/config', {
    preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      tags: ['BE Agent'],
      summary: 'Update BE Agent AI configuration (Admin+)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          endpoint: { type: 'string' },
          apiKey: { type: 'string' },
          model: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { endpoint?: string; apiKey?: string; model?: string };
    const updates: Promise<any>[] = [];

    if (body.endpoint !== undefined) {
      updates.push(
        SystemConfig.findOneAndUpdate(
          { _id: 'be_agent_endpoint' },
          { $set: { value: body.endpoint } },
          { upsert: true }
        )
      );
    }
    if (body.apiKey) {
      updates.push(
        SystemConfig.findOneAndUpdate(
          { _id: 'be_agent_api_key' },
          { $set: { value: body.apiKey } },
          { upsert: true }
        )
      );
    }
    if (body.model !== undefined) {
      updates.push(
        SystemConfig.findOneAndUpdate(
          { _id: 'be_agent_model' },
          { $set: { value: body.model } },
          { upsert: true }
        )
      );
    }

    await Promise.all(updates);
    return reply.send({ success: true });
  });
}
