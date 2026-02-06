import { z } from 'zod';

/**
 * Validation schemas for Device operations
 * Uses Zod for runtime type validation and TypeScript type inference
 */

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * ULID validation pattern
 * Format: 26 uppercase alphanumeric characters (no special chars)
 * Example: 01HGW5N8XZ7KQRST9VW2XY3Z4A
 */
export const ulidSchema = z
  .string()
  .length(26)
  .regex(/^[0-9A-Z]{26}$/, 'Invalid ULID format')
  .describe('ULID identifier (26 characters, time-sortable)');

/**
 * Device attributes schema
 * Flexible JSON object for custom device metadata
 */
export const deviceAttributesSchema = z
  .record(z.unknown())
  .optional()
  .describe('Custom device attributes (key-value pairs)');

/**
 * Device tags schema
 * Array of strings for categorization and filtering
 */
export const deviceTagsSchema = z
  .array(z.string().min(1).max(100))
  .max(50)
  .optional()
  .default([])
  .describe('Device tags for categorization (max 50 tags, 100 chars each)');

// ============================================================================
// Create Device
// ============================================================================

/**
 * Schema for creating a new device
 * deviceId will be auto-generated with ULID in the service layer
 */
export const createDeviceSchema = z.object({
  name: z
    .string()
    .min(1, 'Device name is required')
    .max(255, 'Device name must be less than 255 characters')
    .describe('Human-readable device name'),

  tags: deviceTagsSchema,

  attributes: deviceAttributesSchema,
});

export type CreateDeviceDTO = z.infer<typeof createDeviceSchema>;

// ============================================================================
// Update Device
// ============================================================================

/**
 * Schema for updating an existing device
 * All fields are optional (partial update)
 */
export const updateDeviceSchema = z.object({
  name: z
    .string()
    .min(1, 'Device name cannot be empty')
    .max(255, 'Device name must be less than 255 characters')
    .optional(),

  tags: deviceTagsSchema,

  attributes: deviceAttributesSchema,
});

export type UpdateDeviceDTO = z.infer<typeof updateDeviceSchema>;

// ============================================================================
// Query Devices
// ============================================================================

/**
 * Schema for querying/filtering devices
 */
export const queryDevicesSchema = z.object({
  // Pagination
  limit: z
    .coerce.number()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe('Number of results (1-1000)'),

  offset: z
    .coerce.number()
    .min(0)
    .optional()
    .default(0)
    .describe('Offset for pagination'),

  // Filtering
  tags: z
    .string()
    .transform((val) => val.split(',').map((t) => t.trim()).filter(Boolean))
    .pipe(z.array(z.string()).optional())
    .optional()
    .describe('Filter by tags (comma-separated)'),

  search: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('Search device names (case-insensitive)'),

  // Sorting
  sortBy: z
    .enum(['name', 'deviceId', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt')
    .describe('Sort field'),

  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .describe('Sort order'),
});

export type QueryDevicesDTO = z.infer<typeof queryDevicesSchema>;

// ============================================================================
// Device ID Parameter
// ============================================================================

/**
 * Schema for device ID path parameter
 */
export const deviceIdParamSchema = z.object({
  deviceId: ulidSchema,
});

export type DeviceIdParam = z.infer<typeof deviceIdParamSchema>;

// ============================================================================
// Response Schemas (for documentation)
// ============================================================================

/**
 * Device response schema
 */
export const deviceResponseSchema = z.object({
  id: z.string().uuid(),
  deviceId: ulidSchema,
  name: z.string(),
  tags: z.array(z.string()),
  attributes: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DeviceResponse = z.infer<typeof deviceResponseSchema>;

/**
 * Paginated devices response
 */
export const paginatedDevicesResponseSchema = z.object({
  data: z.array(deviceResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type PaginatedDevicesResponse = z.infer<typeof paginatedDevicesResponseSchema>;
