import { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

/**
 * Get dashboard by ID
 */
export async function getDashboard(
  request: FastifyRequest<{
    Params: { dashboardId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { dashboardId } = request.params;
    // TODO: Get userId from authenticated user (for now using hardcoded)
    const userId = 'admin'; // Will be replaced with request.user.id after auth integration

    const dashboard = await dashboardService.getDashboard(userId, dashboardId);

    if (!dashboard) {
      return reply.code(404).send({
        success: false,
        error: 'Dashboard not found',
      });
    }

    return reply.send({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    request.log.warn(error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch dashboard',
    });
  }
}

/**
 * Get all dashboards for current user
 */
export async function getUserDashboards(request: FastifyRequest, reply: FastifyReply) {
  try {
    // TODO: Get userId from authenticated user
    const userId = 'admin';

    const dashboards = await dashboardService.getUserDashboards(userId);

    return reply.send({
      success: true,
      data: dashboards,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch dashboards',
    });
  }
}

/**
 * Save dashboard (create or update)
 */
export async function saveDashboard(
  request: FastifyRequest<{
    Body: {
      dashboardId: string;
      organizationId: string;
      name?: string;
      description?: string;
      blocks: any[];
      layouts: Record<string, any>;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { dashboardId, organizationId, name, description, blocks, layouts } = request.body;
    // TODO: Get userId from authenticated user
    const userId = 'admin';

    const dashboard = await dashboardService.saveDashboard(userId, organizationId, dashboardId, {
      name,
      description,
      blocks,
      layouts,
    });

    return reply.send({
      success: true,
      data: dashboard,
      message: 'Dashboard saved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to save dashboard',
    });
  }
}

/**
 * Delete dashboard
 */
export async function deleteDashboard(
  request: FastifyRequest<{
    Params: { dashboardId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { dashboardId } = request.params;
    // TODO: Get userId from authenticated user
    const userId = 'admin';

    const deleted = await dashboardService.deleteDashboard(userId, dashboardId);

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        error: 'Dashboard not found',
      });
    }

    return reply.send({
      success: true,
      message: 'Dashboard deleted successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to delete dashboard',
    });
  }
}

/**
 * Share dashboard with other users
 */
export async function shareDashboard(
  request: FastifyRequest<{
    Params: { dashboardId: string };
    Body: { sharedWith: string[] };
  }>,
  reply: FastifyReply
) {
  try {
    const { dashboardId } = request.params;
    const { sharedWith } = request.body;
    // TODO: Get userId from authenticated user
    const userId = 'admin';

    const dashboard = await dashboardService.shareDashboard(userId, dashboardId, sharedWith);

    if (!dashboard) {
      return reply.code(404).send({
        success: false,
        error: 'Dashboard not found',
      });
    }

    return reply.send({
      success: true,
      data: dashboard,
      message: 'Dashboard shared successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to share dashboard',
    });
  }
}

/**
 * Get shared dashboards
 */
export async function getSharedDashboards(request: FastifyRequest, reply: FastifyReply) {
  try {
    // TODO: Get userId from authenticated user
    const userId = 'admin';

    const dashboards = await dashboardService.getSharedDashboards(userId);

    return reply.send({
      success: true,
      data: dashboards,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch shared dashboards',
    });
  }
}
