import mongoose from 'mongoose';
import { Organization, type IOrganization } from '../models/organization.model';
import { Device } from '../models/device.model';
import { DeviceState } from '../models/device-state.model';

/**
 * OrganizationService handles organization CRUD operations
 */
class OrganizationService {
  /**
   * Create a new organization
   */
  async create(data: {
    name: string;
    slug: string;
    settings?: Record<string, any>;
  }): Promise<IOrganization> {
    const org = new Organization({
      name: data.name,
      slug: data.slug,
      settings: data.settings || {},
    });
    return org.save();
  }

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<IOrganization | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Organization.findById(id).lean() as Promise<IOrganization | null>;
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<IOrganization | null> {
    return Organization.findOne({ slug }).lean() as Promise<IOrganization | null>;
  }

  /**
   * List all organizations with pagination
   */
  async list(options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<{
    organizations: IOrganization[];
    total: number;
  }> {
    const { limit = 20, offset = 0, search } = options;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      Organization.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Organization.countDocuments(filter),
    ]);

    return { organizations: organizations as unknown as IOrganization[], total };
  }

  /**
   * Update organization
   */
  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      settings?: Record<string, any>;
    }
  ): Promise<IOrganization | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Organization.findByIdAndUpdate(id, { $set: data }, { new: true }).lean() as Promise<IOrganization | null>;
  }

  /**
   * Delete organization (cascade deletes devices and states)
   */
  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;

    const org = await Organization.findById(id);
    if (!org) return false;

    try {
      const objectId = new mongoose.Types.ObjectId(id);

      // Note: MongoDB Time Series Collections don't support transactions for delete operations
      // Perform cascade deletes sequentially instead
      await DeviceState.deleteMany({ 'metadata.orgId': objectId });
      await Device.deleteMany({ orgId: objectId });
      await Organization.findByIdAndDelete(id);

      return true;
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }
  }

  /**
   * Get organization statistics
   */
  async getStats(id: string): Promise<{
    deviceCount: number;
    stateCount: number;
  } | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const org = await Organization.findById(id);
    if (!org) return null;

    const objectId = new mongoose.Types.ObjectId(id);
    const [deviceCount, stateCount] = await Promise.all([
      Device.countDocuments({ orgId: objectId }),
      DeviceState.countDocuments({ 'metadata.orgId': objectId }),
    ]);

    return { deviceCount, stateCount };
  }
}

export const organizationService = new OrganizationService();
