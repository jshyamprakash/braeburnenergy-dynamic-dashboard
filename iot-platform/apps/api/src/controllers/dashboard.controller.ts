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
    const { orgId } = getRequestContext(request);
    const { dashboardId } = request.params;
    const { applicationId } = request.query;

    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }

    const dashboard = await dashboardService.getDashboard(orgId, dashboardId, applicationId);

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
      };
    }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { dashboardId, applicationId, name, description, blocks, layouts } = request.body;

    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }

    const dashboard = await dashboardService.saveDashboard(orgId, applicationId, dashboardId, {
      name,
      description,
      blocks,
      layouts,
    });

    return sendSuccess(reply, dashboard);
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
