import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuditLog } from '../models';
import { NotFoundError } from '../lib/errors';
import { sendSuccess } from '../lib/response';

/**
 * AuditLogController
 *
 * Handles audit log queries (read-only, append-only EPA 21 CFR Part 11).
 * Zero try/catch — errors propagate to global error handler.
 */
export class AuditLogController {
  /**
   * GET /audit-logs
   */
  async listAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    const {
      userId,
      username,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      success,
      page = 1,
      limit = 50,
    } = request.query as any;

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (username) filter.username = { $regex: username, $options: 'i' };
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (resourceId) filter.resourceId = resourceId;
    if (success !== undefined) filter.success = success === 'true';

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return reply.code(200).send({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /**
   * GET /audit-logs/:id
   */
  async getAuditLog(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const log = await AuditLog.findById(id).lean();

    if (!log) {
      throw new NotFoundError('Audit log');
    }

    return sendSuccess(reply, log);
  }

  /**
   * GET /audit-logs/resources/:resource/:resourceId
   */
  async getResourceAuditTrail(request: FastifyRequest, reply: FastifyReply) {
    const { resource, resourceId } = request.params as { resource: string; resourceId: string };
    const { page = 1, limit = 50 } = request.query as { page?: number; limit?: number };

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find({ resource, resourceId }).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments({ resource, resourceId }),
    ]);

    return reply.code(200).send({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /**
   * GET /audit-logs/export
   */
  async exportAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    const filter: any = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(10000).lean();

    const csvHeader = 'Timestamp,User ID,Username,Action,Resource,Resource ID,Success,Error Message,IP Address\n';
    const csvRows = logs.map((log) =>
      [
        log.timestamp.toISOString(),
        log.userId,
        log.username,
        log.action,
        log.resource,
        log.resourceId || '',
        log.success,
        log.errorMessage || '',
        log.metadata?.ipAddress || '',
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(',')
    );

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`)
      .send(csvHeader + csvRows.join('\n'));
  }

  /**
   * GET /audit-logs/statistics
   */
  async getAuditStatistics(request: FastifyRequest, reply: FastifyReply) {
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    const filter: any = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const stats = await AuditLog.aggregate([
      { $match: filter },
      {
        $facet: {
          byAction: [{ $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          byResource: [{ $group: { _id: '$resource', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          bySuccess: [{ $group: { _id: '$success', count: { $sum: 1 } } }],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    return sendSuccess(reply, {
      total: stats[0].total[0]?.count || 0,
      byAction: stats[0].byAction,
      byResource: stats[0].byResource,
      bySuccess: stats[0].bySuccess,
    });
  }
}

export const auditLogController = new AuditLogController();

// Legacy named function exports for backward compat
export const listAuditLogs = (req: FastifyRequest, reply: FastifyReply) => auditLogController.listAuditLogs(req, reply);
export const getAuditLog = (req: FastifyRequest, reply: FastifyReply) => auditLogController.getAuditLog(req, reply);
export const getResourceAuditTrail = (req: FastifyRequest, reply: FastifyReply) => auditLogController.getResourceAuditTrail(req, reply);
export const exportAuditLogs = (req: FastifyRequest, reply: FastifyReply) => auditLogController.exportAuditLogs(req, reply);
export const getAuditStatistics = (req: FastifyRequest, reply: FastifyReply) => auditLogController.getAuditStatistics(req, reply);
