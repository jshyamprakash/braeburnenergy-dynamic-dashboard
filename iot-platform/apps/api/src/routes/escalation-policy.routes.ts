import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { EscalationPolicy } from '../models/escalation-policy.model';
import { NotificationChannel } from '../models/notification-channel.model';
import { NotFoundError, ValidationError } from '../lib/errors';
import { getRequestContext } from '../lib/request-context';

/**
 * Escalation Policy Routes (ADR-059)
 *
 * CRUD endpoints for managing alarm escalation policies.
 * Requires Admin or above.
 */
export async function escalationPolicyRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, requireRole('Admin')];

  const tierSchema = {
    type: 'object',
    required: ['delayMinutes', 'channelIds', 'minimumSeverity'],
    properties: {
      delayMinutes: { type: 'integer', minimum: 1 },
      channelIds: { type: 'array', items: { type: 'string' } },
      minimumSeverity: {
        type: 'string',
        enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      },
    },
  };

  // ─── POST /escalation-policies ────────────────────────────────────────────

  fastify.post(
    '/escalation-policies',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'Create an escalation policy',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'tiers'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            alarmRuleId: { type: 'string' },
            tiers: { type: 'array', items: tierSchema, minItems: 1 },
            isActive: { type: 'boolean', default: true },
          },
        },
      },
      preHandler,
    },
    async (request, reply) => {
      const { orgId } = getRequestContext(request);
      const body = request.body as any;

      await _validateChannelIds(orgId, body.tiers);

      const policy = await EscalationPolicy.create({
        orgId: new mongoose.Types.ObjectId(orgId),
        name: body.name,
        ...(body.alarmRuleId && { alarmRuleId: new mongoose.Types.ObjectId(body.alarmRuleId) }),
        tiers: body.tiers.map((t: any) => ({
          delayMinutes: t.delayMinutes,
          channelIds: t.channelIds.map((id: string) => new mongoose.Types.ObjectId(id)),
          minimumSeverity: t.minimumSeverity,
        })),
        isActive: body.isActive ?? true,
      });

      return reply.code(201).send({ success: true, data: policy.toObject() });
    }
  );

  // ─── GET /escalation-policies ─────────────────────────────────────────────

  fastify.get(
    '/escalation-policies',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'List escalation policies',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            isActive: { type: 'boolean' },
            alarmRuleId: { type: 'string' },
          },
        },
      },
      preHandler,
    },
    async (request, reply) => {
      const { orgId } = getRequestContext(request);
      const query = request.query as any;

      const filter: any = { orgId: new mongoose.Types.ObjectId(orgId) };
      if (query.isActive !== undefined) filter.isActive = query.isActive;
      if (query.alarmRuleId) filter.alarmRuleId = new mongoose.Types.ObjectId(query.alarmRuleId);

      const policies = await EscalationPolicy.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return reply.send({ success: true, data: policies });
    }
  );

  // ─── GET /escalation-policies/:id ─────────────────────────────────────────

  fastify.get(
    '/escalation-policies/:id',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'Get an escalation policy by ID',
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

      const policy = await EscalationPolicy.findOne({
        _id: new mongoose.Types.ObjectId(id),
        orgId: new mongoose.Types.ObjectId(orgId),
      }).lean();

      if (!policy) throw new NotFoundError('EscalationPolicy');

      return reply.send({ success: true, data: policy });
    }
  );

  // ─── PATCH /escalation-policies/:id ───────────────────────────────────────

  fastify.patch(
    '/escalation-policies/:id',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'Update an escalation policy',
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
            alarmRuleId: { type: 'string' },
            tiers: { type: 'array', items: tierSchema, minItems: 1 },
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

      if (body.tiers) await _validateChannelIds(orgId, body.tiers);

      const update: any = {};
      if (body.name !== undefined) update.name = body.name;
      if (body.alarmRuleId !== undefined)
        update.alarmRuleId = body.alarmRuleId
          ? new mongoose.Types.ObjectId(body.alarmRuleId)
          : undefined;
      if (body.isActive !== undefined) update.isActive = body.isActive;
      if (body.tiers !== undefined) {
        update.tiers = body.tiers.map((t: any) => ({
          delayMinutes: t.delayMinutes,
          channelIds: t.channelIds.map((cid: string) => new mongoose.Types.ObjectId(cid)),
          minimumSeverity: t.minimumSeverity,
        }));
      }

      const policy = await EscalationPolicy.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), orgId: new mongoose.Types.ObjectId(orgId) },
        { $set: update },
        { new: true }
      ).lean();

      if (!policy) throw new NotFoundError('EscalationPolicy');

      return reply.send({ success: true, data: policy });
    }
  );

  // ─── DELETE /escalation-policies/:id ──────────────────────────────────────

  fastify.delete(
    '/escalation-policies/:id',
    {
      schema: {
        tags: ['Alarm Notifications'],
        summary: 'Delete an escalation policy',
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

      const result = await EscalationPolicy.deleteOne({
        _id: new mongoose.Types.ObjectId(id),
        orgId: new mongoose.Types.ObjectId(orgId),
      });

      if (result.deletedCount === 0) throw new NotFoundError('EscalationPolicy');

      return reply.send({ success: true });
    }
  );
}

/**
 * Validate that all channelIds in tiers belong to the org.
 * Throws ValidationError if any IDs are not found.
 */
async function _validateChannelIds(orgId: string, tiers: any[]): Promise<void> {
  const allIds = tiers.flatMap((t: any) => t.channelIds as string[]);
  if (allIds.length === 0) return;

  const unique = [...new Set(allIds)];
  const found = await NotificationChannel.countDocuments({
    _id: { $in: unique.map((id) => new mongoose.Types.ObjectId(id)) },
    orgId: new mongoose.Types.ObjectId(orgId),
  });

  if (found !== unique.length) {
    throw new ValidationError('One or more channelIds do not exist in this organization', []);
  }
}
