import { z } from 'zod';

/**
 * Schema for creating an organization
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255).describe('Organization name'),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .describe('URL-friendly identifier'),
  settings: z.record(z.any()).optional().describe('Organization settings'),
});

/**
 * Schema for updating an organization
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional().describe('Organization name'),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .describe('URL-friendly identifier'),
  settings: z.record(z.any()).optional().describe('Organization settings'),
});

/**
 * Schema for organization ID parameter
 */
export const orgIdParamSchema = z.object({
  orgId: z.string().uuid().describe('Organization UUID'),
});

/**
 * Schema for organization slug parameter
 */
export const orgSlugParamSchema = z.object({
  slug: z.string().describe('Organization slug'),
});

/**
 * Schema for querying organizations
 */
export const queryOrganizationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional().describe('Maximum number of results'),
  offset: z.coerce.number().int().min(0).default(0).optional().describe('Number of results to skip'),
  search: z.string().optional().describe('Search by name or slug'),
});
