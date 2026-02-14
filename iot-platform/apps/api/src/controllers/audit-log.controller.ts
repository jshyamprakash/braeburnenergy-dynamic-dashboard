import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditLog } from '../models';

/**
 * Audit Log Controller
 *
 * Handles audit log queries and exports (read-only, append-only collection).
 */

interface AuditLogQuery {
  userId?: string;
  username?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT';
  resource?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  success?: string;
  page?: number;
  limit?: number;
}

/**
 * List audit logs with filtering and pagination
 */
export async function listAuditLogs(request: FastifyRequest, reply: FastifyReply) {
  try {
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
    } = request.query as AuditLogQuery;

    // Build filter object
    const filter: any = {};

    if (userId) filter.userId = userId;
    if (username) filter.username = { $regex: username, $options: 'i' };
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (resourceId) filter.resourceId = resourceId;
    if (success !== undefined) filter.success = success === 'true';

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return reply.status(200).send({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.log.error({ error }, 'List audit logs error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve audit logs',
    });
  }
}

/**
 * Get audit log by ID
 */
export async function getAuditLog(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const log = await AuditLog.findById(id).lean();

    if (!log) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'Audit log not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: log,
    });
  } catch (error) {
    request.log.error({ error }, 'Get audit log error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve audit log',
    });
  }
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditTrail(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { resource, resourceId } = request.params as { resource: string; resourceId: string };
    const { page = 1, limit = 50 } = request.query as { page?: number; limit?: number };

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ resource, resourceId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments({ resource, resourceId }),
    ]);

    return reply.status(200).send({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Get resource audit trail error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve audit trail',
    });
  }
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    // Build filter
    const filter: any = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Fetch all matching logs (limit to prevent memory issues)
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000) // Max 10,000 records for export
      .lean();

    // Convert to CSV
    const csvHeader = 'Timestamp,User ID,Username,Action,Resource,Resource ID,Success,Error Message,IP Address\n';
    const csvRows = logs.map((log) => {
      return [
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
        .join(',');
    });

    const csv = csvHeader + csvRows.join('\n');

    // Send as downloadable file
    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`)
      .send(csv);
  } catch (error) {
    request.log.error({ error }, 'Export audit logs error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to export audit logs',
    });
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    // Build filter
    const filter: any = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Aggregate statistics
    const stats = await AuditLog.aggregate([
      { $match: filter },
      {
        $facet: {
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byResource: [
            { $group: { _id: '$resource', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          bySuccess: [{ $group: { _id: '$success', count: { $sum: 1 } } }],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        total: stats[0].total[0]?.count || 0,
        byAction: stats[0].byAction,
        byResource: stats[0].byResource,
        bySuccess: stats[0].bySuccess,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Get audit statistics error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve audit statistics',
    });
  }
}
