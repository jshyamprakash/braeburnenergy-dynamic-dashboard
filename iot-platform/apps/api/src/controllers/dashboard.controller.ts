import type { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/dashboard.service';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { sendSuccess, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';

const dashboardService = new DashboardService();

/**
 * DashboardController
 *
 * HTTP request handlers for dashboard management.
 * Dashboards are scoped to orgId + applicationId (ADR-038).
 * Zero try/catch — errors propagate to global error handler.
 */
export class DashboardController {
  /**
   * GET /dashboards/:dashboardId?applicationId=
   */
  async getDashboard(
    request: FastifyRequest<{ Params: { dashboardId: string }; Querystring: { applicationId?: string } }>,
    reply: FastifyReply
  ) {
    const { orgId, userId, role } = getRequestContext(request);
    const { dashboardId } = request.params;
    const { applicationId } = request.query;

    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }

    const dashboard = await dashboardService.getDashboard(orgId, dashboardId, applicationId, { role, userId });

    if (!dashboard) {
      throw new NotFoundError('Dashboard');
    }

    return sendSuccess(reply, dashboard);
  }

  /**
   * GET /dashboards?applicationId=
   */
  async getDashboards(
    request: FastifyRequest<{ Querystring: { applicationId?: string } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { applicationId } = request.query;

    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }

    const dashboards = await dashboardService.getDashboards(orgId, applicationId);
    return sendSuccess(reply, dashboards);
  }

  /**
   * POST /dashboards
   */
  async saveDashboard(
    request: FastifyRequest<{
      Body: {
        dashboardId: string;
        applicationId: string;
        name?: string;
        description?: string;
        blocks: any[];
        layouts: Record<string, any>;
        pages?: any[];
      };
    }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { dashboardId, applicationId, name, description, blocks, layouts, pages } = request.body;

    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }

    const dashboard = await dashboardService.saveDashboard(orgId, applicationId, dashboardId, {
      name,
      description,
      blocks,
      layouts,
      pages,
    });

    return sendSuccess(reply, dashboard);
  }

  /**
   * POST /dashboards/:dashboardId/share
   * ADR-045: Share dashboard with specific org users (body: { userIds: string[] })
   */
  async shareWithUsers(
    request: FastifyRequest<{ Params: { dashboardId: string }; Body: { assignments: { userId: string; pageIds: string[] }[] } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { dashboardId } = request.params;
    const { assignments } = request.body;

    if (!Array.isArray(assignments)) {
      throw new BadRequestError('assignments must be an array');
    }

    const result = await dashboardService.shareWithUsers(orgId, dashboardId, assignments);
    return sendSuccess(reply, result);
  }

  /**
   * GET /dashboards/my
   * ADR-045: Returns dashboards assigned to the authenticated Viewer user.
   */
  async getViewerDashboards(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const { orgId, userId } = getRequestContext(request);
    const dashboards = await dashboardService.getDashboardsForViewer(orgId, userId);
    return sendSuccess(reply, dashboards);
  }

  /**
   * DELETE /dashboards/:dashboardId
   */
  async deleteDashboard(
    request: FastifyRequest<{ Params: { dashboardId: string } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { dashboardId } = request.params;
    const deleted = await dashboardService.deleteDashboard(orgId, dashboardId);

    if (!deleted) {
      throw new NotFoundError('Dashboard');
    }

    return sendDeleted(reply, 'Dashboard deleted successfully');
  }
}

export const dashboardController = new DashboardController();

// Named function exports for route registrations
export const getDashboard = (req: FastifyRequest<any>, reply: FastifyReply) =>
  dashboardController.getDashboard(req, reply);
export const getUserDashboards = (req: FastifyRequest<any>, reply: FastifyReply) =>
  dashboardController.getDashboards(req, reply);
export const saveDashboard = (req: FastifyRequest<any>, reply: FastifyReply) =>
  dashboardController.saveDashboard(req, reply);
export const deleteDashboard = (req: FastifyRequest<any>, reply: FastifyReply) =>
  dashboardController.deleteDashboard(req, reply);
export const shareWithUsers = (req: FastifyRequest<any>, reply: FastifyReply) =>
  dashboardController.shareWithUsers(req, reply);
export const getViewerDashboards = (req: FastifyRequest<any>, reply: FastifyReply) =>
  dashboardController.getViewerDashboards(req, reply);
