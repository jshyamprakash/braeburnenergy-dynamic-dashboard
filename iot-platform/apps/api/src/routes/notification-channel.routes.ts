import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { NotificationChannel } from '../models/notification-channel.model';
import { NotFoundError } from '../lib/errors';
import { getRequestContext } from '../lib/request-context';

/**
 * Notification Channel Routes (ADR-059)
 *
 * CRUD endpoints for managing outbound notification channels.
 * Requires Admin or above.
 */
export async function notificationChannelRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, requireRole('Admin')];

  // ─── POST /notification-channels ──────────────────────────────────────────

  fastify.post(
    '/notification-channels',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'Create a notification channel',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            type: { type: 'string', enum: ['email', 'webhook', 'in-app'] },
            config: { type: 'object', additionalProperties: true },
            isActive: { type: 'boolean', default: true },
          },
        },
      },
      preHandler,
    },
    async (request, reply) => {
      const { orgId } = getRequestContext(request);
      const body = request.body as any;

      const channel = await NotificationChannel.create({
        orgId: new mongoose.Types.ObjectId(orgId),
        name: body.name,
        type: body.type,
        config: body.config ?? {},
        isActive: body.isActive ?? true,
      });

      return reply.code(201).send({ success: true, data: channel.toObject() });
    }
  );

  // ─── GET /notification-channels ───────────────────────────────────────────

  fastify.get(
    '/notification-channels',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'List notification channels',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['email', 'webhook', 'in-app'] },
            isActive: { type: 'boolean' },
          },
        },
      },
      preHandler,
    },
    async (request, reply) => {
      const { orgId } = getRequestContext(request);
      const query = request.query as any;

      const filter: any = { orgId: new mongoose.Types.ObjectId(orgId) };
      if (query.type) filter.type = query.type;
      if (query.isActive !== undefined) filter.isActive = query.isActive;

      const channels = await NotificationChannel.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return reply.send({ success: true, data: channels });
    }
  );

  // ─── GET /notification-channels/:id ───────────────────────────────────────

  fastify.get(
    '/notification-channels/:id',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'Get a notification channel by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
      preHandler,
    },
    async (request, reply) => {
      const { orgId } = getRequestContext(request);
      const { id } = request.params as { id: string };

      const channel = await NotificationChannel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        orgId: new mongoose.Types.ObjectId(orgId),
      }).lean();

      if (!channel) throw new NotFoundError('NotificationChannel');

      return reply.send({ success: true, data: channel });
    }
  );

  // ─── PATCH /notification-channels/:id ─────────────────────────────────────

  fastify.patch(
    '/notification-channels/:id',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'Update a notification channel',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            config: { type: 'object', additionalProperties: true },
            isActive: { type: 'boolean' },
          },
        },
      },
      preHandler,
    },
    async (request, reply) => {
      const { orgId } = getRequestContext(request);
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const update: any = {};
      if (body.name !== undefined) update.name = body.name;
      if (body.config !== undefined) update.config = body.config;
      if (body.isActive !== undefined) update.isActive = body.isActive;

      const channel = await NotificationChannel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), orgId: new mongoose.Types.ObjectId(orgId) },
        { $set: update },
        { new: true }
      ).lean();

      if (!channel) throw new NotFoundError('NotificationChannel');

      return reply.send({ success: true, data: channel });
    }
  );

  // ─── DELETE /notification-channels/:id ────────────────────────────────────

  fastify.delete(
    '/notification-channels/:id',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'Delete a notification channel',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
      preHandler,
    },
    async (request, reply) => {
      const { orgId } = getRequestContext(request);
      const { id } = request.params as { id: string };

      const result = await NotificationChannel.deleteOne({
        _id: new mongoose.Types.ObjectId(id),
        orgId: new mongoose.Types.ObjectId(orgId),
      });

      if (result.deletedCount === 0) throw new NotFoundError('NotificationChannel');

      return reply.send({ success: true });
    }
  );
}
