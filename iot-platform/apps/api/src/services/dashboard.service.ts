import { Dashboard, type IDashboard, type IDashboardBlock } from '../models/dashboard.model';

export class DashboardService {
  /**
   * Get dashboard by userId and dashboardId
   */
  async getDashboard(userId: string, dashboardId: string): Promise<IDashboard | null> {
    return Dashboard.findOne({ userId, dashboardId }).lean() as unknown as Promise<IDashboard | null>;
  }

  /**
   * Get all dashboards for a user
   */
  async getUserDashboards(userId: string): Promise<IDashboard[]> {
    return Dashboard.find({ userId }).sort({ updatedAt: -1 }).lean() as unknown as Promise<IDashboard[]>;
  }

  /**
   * Get all dashboards for an organization
   */
  async getOrganizationDashboards(organizationId: string): Promise<IDashboard[]> {
    return Dashboard.find({ organizationId }).sort({ updatedAt: -1 }).lean() as unknown as Promise<IDashboard[]>;
  }

  /**
   * Create or update dashboard (upsert)
   */
  async saveDashboard(
    userId: string,
    organizationId: string,
    dashboardId: string,
    data: {
      name?: string;
      description?: string;
      blocks: IDashboardBlock[];
      layouts: Record<string, any>;
    }
  ): Promise<IDashboard> {
    const dashboard = await Dashboard.findOneAndUpdate(
      { userId, dashboardId },
      {
        $set: {
          userId,
          organizationId,
          dashboardId,
          name: data.name || 'My Dashboard',
          description: data.description || '',
          blocks: data.blocks,
          layouts: data.layouts,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return dashboard.toObject();
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(userId: string, dashboardId: string): Promise<boolean> {
    const result = await Dashboard.deleteOne({ userId, dashboardId });
    return result.deletedCount > 0;
  }

  /**
   * Share dashboard with other users
   */
  async shareDashboard(
    userId: string,
    dashboardId: string,
    sharedWith: string[]
  ): Promise<IDashboard | null> {
    const dashboard = await Dashboard.findOneAndUpdate(
      { userId, dashboardId },
      {
        $set: {
          isShared: true,
          sharedWith,
        },
      },
      { new: true }
    );

    return dashboard ? dashboard.toObject() : null;
  }

  /**
   * Get shared dashboards for a user
   */
  async getSharedDashboards(userId: string): Promise<IDashboard[]> {
    return Dashboard.find({
      isShared: true,
      sharedWith: userId,
    })
      .sort({ updatedAt: -1 })
      .lean() as unknown as Promise<IDashboard[]>;
  }

  /**
   * Check if user has access to dashboard
   */
  async hasAccess(userId: string, dashboardId: string): Promise<boolean> {
    const count = await Dashboard.countDocuments({
      dashboardId,
      $or: [{ userId }, { isShared: true, sharedWith: userId }],
    });

    return count > 0;
  }

  /**
   * Duplicate dashboard
   */
  async duplicateDashboard(
    userId: string,
    organizationId: string,
    sourceDashboardId: string,
    newDashboardId: string,
    newName: string
  ): Promise<IDashboard | null> {
    const source = await Dashboard.findOne({ userId, dashboardId: sourceDashboardId });

    if (!source) {
      return null;
    }

    const duplicate = new Dashboard({
      userId,
      organizationId,
      dashboardId: newDashboardId,
      name: newName,
      description: source.description,
      blocks: source.blocks,
      layouts: source.layouts,
      isShared: false,
      sharedWith: [],
    });

    await duplicate.save();
    return duplicate.toObject();
  }
}
