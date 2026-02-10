import { prisma } from '../lib/prisma';
import type { Organization, Prisma } from '@prisma/client';

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
  }): Promise<Organization> {
    return prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        settings: data.settings || {},
      },
    });
  }

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
    });
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { slug },
    });
  }

  /**
   * List all organizations with pagination
   */
  async list(options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<{
    organizations: Organization[];
    total: number;
  }> {
    const { limit = 20, offset = 0, search } = options;

    const where: Prisma.OrganizationWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.count({ where }),
    ]);

    return { organizations, total };
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
  ): Promise<Organization | null> {
    try {
      return await prisma.organization.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null; // Organization not found
      }
      throw error;
    }
  }

  /**
   * Delete organization (cascade deletes devices and states)
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.organization.delete({
        where: { id },
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        return false; // Organization not found
      }
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
    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            devices: true,
            deviceStates: true,
          },
        },
      },
    });

    if (!org) {
      return null;
    }

    return {
      deviceCount: org._count.devices,
      stateCount: org._count.deviceStates,
    };
  }
}

export const organizationService = new OrganizationService();
