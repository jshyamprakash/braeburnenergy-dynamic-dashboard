import mongoose from 'mongoose';
import { Dashboard, type IDashboard, type IDashboardBlock, type IKosmosPage } from '../models/dashboard.model';
import { Device } from '../models/device.model';
import { Workflow } from '../models/workflow.model';
import { User } from '../models/user.model';
import { UnprocessableError, BadRequestError, NotFoundError, ForbiddenError } from '../lib/errors';

export class DashboardService {
  /**
   * Get dashboard by dashboardId, scoped to org + application.
   * ADR-045: Viewer role may only access dashboards where their userId is in sharedWithUsers.
   */
  async getDashboard(
    orgId: string,
    dashboardId: string,
    applicationId: string,
    options?: { role?: string; userId?: string }
  ): Promise<IDashboard | null> {
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    const dashboard = await Dashboard.findOne({ orgId: orgIdObj, dashboardId, applicationId }).lean() as unknown as IDashboard | null;

    if (!dashboard) return null;

    // Viewer role: gate on sharedWithUsers
    if (options?.role === 'Viewer' && options?.userId) {
      const userId = new mongoose.Types.ObjectId(options.userId);
      const hasAccess = (dashboard.sharedWithUsers ?? []).some(
        (id) => id.toString() === userId.toString()
      );
      if (!hasAccess) throw new ForbiddenError('You do not have access to this dashboard');
    }

    return dashboard;
  }

  /**
   * Get all dashboards scoped to org + application
   */
  async getDashboards(orgId: string, applicationId: string): Promise<IDashboard[]> {
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    return Dashboard.find({ orgId: orgIdObj, applicationId }).sort({ updatedAt: -1 }).lean() as unknown as Promise<IDashboard[]>;
  }

  /**
   * Create or update dashboard (upsert)
   */
  async saveDashboard(
    orgId: string,
    applicationId: string,
    dashboardId: string,
    data: {
      name?: string;
      description?: string;
      blocks: IDashboardBlock[];
      layouts: Record<string, any>;
      pages?: IKosmosPage[];
    }
  ): Promise<IDashboard> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);

    // Enforce ADR-035: Dashboard requires at least one device and one workflow in the application
    const deviceCount = await Device.countDocuments({ orgId: orgIdObj, applicationId });
    if (deviceCount === 0) {
      throw new UnprocessableError('Dashboard requires at least one device in the application');
    }

    const workflowCount = await Workflow.countDocuments({ orgId: orgIdObj, applicationId });
    if (workflowCount === 0) {
      throw new UnprocessableError('Dashboard requires at least one workflow in the application');
    }

    const setFields: Record<string, any> = {
      orgId: orgIdObj,
      applicationId,
      dashboardId,
      name: data.name || 'My Dashboard',
      description: data.description || '',
      blocks: data.blocks,
      layouts: data.layouts,
    };

    if (data.pages !== undefined) {
      setFields.pages = data.pages;
    }

    const dashboard = await Dashboard.findOneAndUpdate(
      { orgId: orgIdObj, dashboardId },
      { $set: setFields },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return dashboard.toObject();
  }

  /**
   * ADR-045: Share dashboard with specific org users (Viewer role).
   * Replaces the old public shareToken approach.
   * userIds: array of User ObjectId strings to grant access.
   */
  async shareWithUsers(orgId: string, dashboardId: string, userIds: string[]): Promise<{ sharedWithUsers: string[] }> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);

    // Validate that all userIds belong to the same org
    const userObjectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));
    const validCount = await User.countDocuments({ _id: { $in: userObjectIds }, organizationId: orgIdObj });
    if (validCount !== userIds.length) {
      throw new BadRequestError('One or more users not found in this organization');
    }

    const dashboard = await Dashboard.findOneAndUpdate(
      { orgId: orgIdObj, dashboardId },
      { $set: { sharedWithUsers: userObjectIds } },
      { new: true }
    );

    if (!dashboard) throw new NotFoundError('Dashboard');

    return { sharedWithUsers: dashboard.sharedWithUsers.map((id) => id.toString()) };
  }

  /**
   * ADR-045: Get all dashboards assigned to a Viewer user.
   */
  async getDashboardsForViewer(orgId: string, userId: string): Promise<IDashboard[]> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    const userIdObj = new mongoose.Types.ObjectId(userId);
    return Dashboard.find({ orgId: orgIdObj, sharedWithUsers: userIdObj })
      .sort({ updatedAt: -1 })
      .lean() as unknown as Promise<IDashboard[]>;
  }

  /**
   * Save Kosmos pages for a dashboard (upserts just the pages field)
   */
  async savePages(orgId: string, dashboardId: string, pages: IKosmosPage[]): Promise<IDashboard> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    const dashboard = await Dashboard.findOneAndUpdate(
      { orgId: orgIdObj, dashboardId },
      { $set: { pages } },
      { new: true }
    );
    if (!dashboard) {
      throw new NotFoundError('Dashboard');
    }
    return dashboard.toObject();
  }

  /**
   * Delete dashboard, scoped to org
   */
  async deleteDashboard(orgId: string, dashboardId: string): Promise<boolean> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    const result = await Dashboard.deleteOne({ orgId: orgIdObj, dashboardId });
    return result.deletedCount > 0;
  }
}
