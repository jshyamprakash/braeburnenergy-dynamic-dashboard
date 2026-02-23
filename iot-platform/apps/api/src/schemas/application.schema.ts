import { z } from 'zod';

/**
 * ULID validation for applicationId
 */
export const applicationIdSchema = z
  .string()
  .length(26)
  .regex(/^[0-9A-Z]{26}$/, 'Invalid ULID format')
  .describe('Application ID (ULID)');

/**
 * Schema for creating an application (slug auto-derived in service)
 */
export const createApplicationSchema = z.object({
  name: z
    .string()
    .min(1, 'Application name is required')
    .max(255, 'Application name must be less than 255 characters')
    .describe('Application name'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .describe('Application description'),
});

export type CreateApplicationDTO = z.infer<typeof createApplicationSchema>;

/**
 * Schema for updating an application
 */
export const updateApplicationSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('Application name'),
  description: z
    .string()
    .max(500)
    .optional()
    .describe('Application description'),
  isActive: z
    .boolean()
    .optional()
    .describe('Whether the application is active'),
});

export type UpdateApplicationDTO = z.infer<typeof updateApplicationSchema>;

/**
 * Schema for application ID parameter
 */
export const applicationIdParamSchema = z.object({
  applicationId: applicationIdSchema,
});

export type ApplicationIdParam = z.infer<typeof applicationIdParamSchema>;

/**
 * Schema for querying applications
 */
export const queryApplicationsSchema = z.object({
  limit: z
    .coerce.number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum number of results'),
  offset: z
    .coerce.number()
    .min(0)
    .optional()
    .default(0)
    .describe('Number of results to skip'),
  search: z
    .string()
    .optional()
    .describe('Search by name'),
  isActive: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional()
    .describe('Filter by active status'),
});

export type QueryApplicationsDTO = z.infer<typeof queryApplicationsSchema>;

/**
 * Application response schema
 */
export const applicationResponseSchema = z.object({
  id: z.string(),
  applicationId: applicationIdSchema,
  orgId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  slug: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ApplicationResponse = z.infer<typeof applicationResponseSchema>;
