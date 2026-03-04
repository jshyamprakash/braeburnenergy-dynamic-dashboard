import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { DEFAULT_ORG_ID } from '../lib/request-context';

export async function notificationRoutes(fastify: FastifyInstance) {
  /**
   * GET /notifications
   * List notifications for org (newest first)
   */
  fastify.get(
    '/notifications',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'List notifications',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
            unreadOnly: { type: 'boolean', default: false },
          },
        },
      },
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { limit, offset, unreadOnly } = request.query as any;
      const result = await notificationService.list(DEFAULT_ORG_ID, { limit, offset, unreadOnly });
      return reply.send({ success: true, ...result });
    }
  );

  /**
   * PATCH /notifications/:notificationId/read
   * Mark a single notification as read
   */
  fastify.patch(
    '/notifications/:notificationId/read',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { notificationId: { type: 'string' } },
          required: ['notificationId'],
        },
      },
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { notificationId } = request.params as { notificationId: string };
      await notificationService.markRead(DEFAULT_ORG_ID, notificationId);
      return reply.send({ success: true });
    }
  );

  /**
   * POST /notifications/read-all
   * Mark all notifications as read
   */
  fastify.post(
    '/notifications/read-all',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    async (_request, reply) => {
      await notificationService.markAllRead(DEFAULT_ORG_ID);
      return reply.send({ success: true });
    }
  );

  /**
   * DELETE /notifications
   * Delete all notifications for org
   */
  fastify.delete(
    '/notifications',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'Delete all notifications',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    async (_request, reply) => {
      await notificationService.deleteAll(DEFAULT_ORG_ID);
      return reply.send({ success: true });
    }
  );
}
