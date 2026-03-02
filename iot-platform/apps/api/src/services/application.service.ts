import { ulid } from 'ulid';
import mongoose from 'mongoose';
import { Application } from '../models/application.model';
import { ConflictError } from '../lib/errors';
import type {
  CreateApplicationDTO,
  UpdateApplicationDTO,
  QueryApplicationsDTO,
} from '../schemas/application.schema';

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * ApplicationService
 *
 * Manages application lifecycle within an organization.
 * Applications are containers for Devices, Workflows, and Dashboards.
 */
export class ApplicationService {
  /**
   * Create a new application with auto-generated ULID and slug
   */
  async create(orgId: string, data: CreateApplicationDTO) {
    const applicationId = ulid();
    const slug = generateSlug(data.name);

    // Check if slug is already taken in this org
    const existing = await Application.findOne({
      orgId: new mongoose.Types.ObjectId(orgId),
      slug,
    });

    if (existing) {
      throw new ConflictError(`Slug "${slug}" is already taken in this organization`);
    }

    const application = new Application({
      orgId: new mongoose.Types.ObjectId(orgId),
      applicationId,
      name: data.name,
      description: data.description,
      slug,
      isActive: true,
    });

    const saved = await application.save();
    return saved.toObject();
  }

  /**
   * Get application by applicationId within organization
   */
  async getById(orgId: string, applicationId: string): Promise<any> {
    return Application.findOne({
      orgId: new mongoose.Types.ObjectId(orgId),
      applicationId,
    }).lean();
  }

  /**
   * List applications for an organization
   */
  async list(orgId: string, query: QueryApplicationsDTO) {
    const { limit = 50, offset = 0, search, isActive } = query;

    const filter: any = {
      orgId: new mongoose.Types.ObjectId(orgId),
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    return {
      data: applications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Update application
   */
  async update(orgId: string, applicationId: string, data: UpdateApplicationDTO) {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      // Auto-regenerate slug if name changed
      updateData.slug = generateSlug(data.name);

      // Verify new slug is unique
      const existing = await Application.findOne({
        orgId: new mongoose.Types.ObjectId(orgId),
        slug: updateData.slug,
        applicationId: { $ne: applicationId },
      });

      if (existing) {
        throw new ConflictError(`Slug "${updateData.slug}" is already taken in this organization`);
      }
    }

    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const application = await Application.findOneAndUpdate(
      {
        orgId: new mongoose.Types.ObjectId(orgId),
        applicationId,
      },
      { $set: updateData },
      { new: true }
    ).lean();

    return application;
  }

  /**
   * Delete application (guard: reject if devices, workflows, or dashboards are linked)
   */
  async delete(orgId: string, applicationId: string) {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);

    const { Device } = await import('../models/device.model');
    const { Workflow } = await import('../models/workflow.model');
    const { Dashboard } = await import('../models/dashboard.model');

    // Check all associations in parallel
    const [deviceCount, workflowCount, dashboardCount] = await Promise.all([
      Device.countDocuments({ orgId: orgIdObj, applicationId }),
      Workflow.countDocuments({ orgId: orgIdObj, applicationId }),
      Dashboard.countDocuments({ orgId: orgIdObj, applicationId }),
    ]);

    const blocking: Record<string, number> = {};
    if (deviceCount > 0) blocking.devices = deviceCount;
    if (workflowCount > 0) blocking.workflows = workflowCount;
    if (dashboardCount > 0) blocking.dashboards = dashboardCount;

    if (Object.keys(blocking).length > 0) {
      throw new ConflictError('Cannot delete application: associated entities must be removed first.', { blocking });
    }

    return Application.findOneAndDelete({ orgId: orgIdObj, applicationId }).lean();
  }
}

// Export singleton instance
export const applicationService = new ApplicationService();
