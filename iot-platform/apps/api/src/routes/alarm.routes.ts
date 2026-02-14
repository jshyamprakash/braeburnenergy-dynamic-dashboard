import { FastifyInstance } from 'fastify';
import * as alarmController from '../controllers/alarm.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

/**
 * Alarm Routes
 *
 * ISA-18.2 compliant alarm management routes.
 */

export async function alarmRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // Alarm Rule Management
  // ============================================================================

  /**
   * POST /alarm-rules
   * Create alarm rule (Admin+)
   */
  fastify.post(
    '/alarm-rules',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Create alarm rule',
        description: 'Create new ISA-18.2 alarm rule (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    alarmController.createAlarmRule
  );

  /**
   * GET /alarm-rules
   * List alarm rules
   */
  fastify.get(
    '/alarm-rules',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'List alarm rules',
        description: 'List all alarm rules with filtering',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    alarmController.listAlarmRules
  );

  /**
   * GET /alarm-rules/:id
   * Get alarm rule by ID
   */
  fastify.get(
    '/alarm-rules/:id',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Get alarm rule',
        description: 'Get specific alarm rule by ID',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    alarmController.getAlarmRule
  );

  /**
   * PATCH /alarm-rules/:id
   * Update alarm rule (Admin+)
   */
  fastify.patch(
    '/alarm-rules/:id',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Update alarm rule',
        description: 'Update existing alarm rule (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    alarmController.updateAlarmRule
  );

  /**
   * DELETE /alarm-rules/:id
   * Delete alarm rule (Admin+)
   */
  fastify.delete(
    '/alarm-rules/:id',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Delete alarm rule',
        description: 'Delete alarm rule (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    alarmController.deleteAlarmRule
  );

  /**
   * POST /alarm-rules/:id/shelve
   * Shelve alarm rule (Admin+)
   */
  fastify.post(
    '/alarm-rules/:id/shelve',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Shelve alarm rule',
        description: 'Temporarily suppress alarm rule (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    alarmController.shelveAlarmRule
  );

  /**
   * POST /alarm-rules/:id/unshelve
   * Unshelve alarm rule (Admin+)
   */
  fastify.post(
    '/alarm-rules/:id/unshelve',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Unshelve alarm rule',
        description: 'Re-enable shelved alarm rule (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    alarmController.unshelveAlarmRule
  );

  // ============================================================================
  // Alarm Instance Management
  // ============================================================================

  /**
   * GET /alarms
   * List alarm instances
   */
  fastify.get(
    '/alarms',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'List alarm instances',
        description: 'List alarm instances with filtering and pagination',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    alarmController.listAlarms
  );

  /**
   * GET /alarms/:id
   * Get alarm instance by ID
   */
  fastify.get(
    '/alarms/:id',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Get alarm instance',
        description: 'Get specific alarm instance by ID',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    alarmController.getAlarm
  );

  /**
   * POST /alarms/:id/acknowledge
   * Acknowledge alarm (Operator+)
   */
  fastify.post(
    '/alarms/:id/acknowledge',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Acknowledge alarm',
        description: 'Acknowledge alarm instance (Operator and above)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Operator')],
    },
    alarmController.acknowledgeAlarm
  );

  /**
   * POST /alarms/:id/shelve
   * Shelve alarm instance (Admin+)
   */
  fastify.post(
    '/alarms/:id/shelve',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Shelve alarm instance',
        description: 'Temporarily suppress alarm instance (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    alarmController.shelveAlarm
  );

  /**
   * POST /alarms/:id/unshelve
   * Unshelve alarm instance (Admin+)
   */
  fastify.post(
    '/alarms/:id/unshelve',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Unshelve alarm instance',
        description: 'Re-enable shelved alarm instance (Admin and SuperAdmin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    alarmController.unshelveAlarm
  );

  /**
   * GET /alarms/statistics
   * Get alarm statistics
   */
  fastify.get(
    '/alarms/statistics',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Get alarm statistics',
        description: 'Get alarm statistics and metrics',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    alarmController.getAlarmStatistics
  );

  /**
   * GET /devices/:deviceId/alarms/active
   * Get active alarms for device
   */
  fastify.get(
    '/devices/:deviceId/alarms/active',
    {
      schema: {
        tags: ['Alarm Management'],
        summary: 'Get device active alarms',
        description: 'Get all active alarms for a specific device',
        security: [{ bearerAuth: [] }],
      },
      preHandler: requireAuth,
    },
    alarmController.getDeviceActiveAlarms
  );
}
