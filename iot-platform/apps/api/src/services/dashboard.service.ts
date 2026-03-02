import mongoose from 'mongoose';
import { Dashboard, type IDashboard, type IDashboardBlock } from '../models/dashboard.model';
import { Device } from '../models/device.model';
import { Workflow } from '../models/workflow.model';
import { UnprocessableError, BadRequestError } from '../lib/errors';

export class DashboardService {
  /**
   * Get dashboard by dashboardId, scoped to org + application
   */
  async getDashboard(orgId: string, dashboardId: string, applicationId: string): Promise<IDashboard | null> {
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    return Dashboard.findOne({ orgId: orgIdObj, dashboardId, applicationId }).lean() as unknown as Promise<IDashboard | null>;
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

    const dashboard = await Dashboard.findOneAndUpdate(
      { orgId: orgIdObj, dashboardId },
      {
        $set: {
          orgId: orgIdObj,
          applicationId,
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
   * Delete dashboard, scoped to org
   */
  async deleteDashboard(orgId: string, dashboardId: string): Promise<boolean> {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    const result = await Dashboard.deleteOne({ orgId: orgIdObj, dashboardId });
    return result.deletedCount > 0;
  }
}
