import { z } from 'zod';
import { ulidSchema } from './device.schema';

/**
 * Validation schemas for DeviceState operations
 * Handles time-series telemetry data
 */

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Device state data payload
 * Flexible JSON object for telemetry data
 */
export const stateDataSchema = z
  .record(z.unknown())
  .refine((data) => Object.keys(data).length > 0, {
    message: 'State data cannot be empty',
  })
  .describe('Device state data (key-value pairs)');

/**
 * ISO 8601 timestamp schema
 */
export const timestampSchema = z
  .string()
  .datetime()
  .or(z.date())
  .transform((val) => (typeof val === 'string' ? new Date(val) : val))
  .describe('ISO 8601 timestamp');

// ============================================================================
// Create Device State
// ============================================================================

/**
 * Schema for creating a new device state
 */
export const createDeviceStateSchema = z.object({
  deviceId: ulidSchema,

  data: stateDataSchema,

  timestamp: timestampSchema.optional().describe('State timestamp (defaults to now)'),
});

export type CreateDeviceStateDTO = z.infer<typeof createDeviceStateSchema>;

// ============================================================================
// Bulk Create Device States
// ============================================================================

/**
 * Schema for bulk creating device states
 * Used for batch ingestion
 */
export const bulkCreateDeviceStatesSchema = z.object({
  states: z
    .array(createDeviceStateSchema)
    .min(1, 'At least one state is required')
    .max(1000, 'Maximum 1000 states per batch')
    .describe('Array of device states'),
});

export type BulkCreateDeviceStatesDTO = z.infer<typeof bulkCreateDeviceStatesSchema>;

// ============================================================================
// Query Device States
// ============================================================================

/**
 * Schema for querying device states (time-series data)
 */
export const queryDeviceStatesSchema = z.object({
  // Time range
  startTime: timestampSchema
    .optional()
    .describe('Start of time range (inclusive)'),

  endTime: timestampSchema
    .optional()
    .describe('End of time range (inclusive)'),

  // Pagination
  limit: z
    .coerce.number()
    .min(1)
    .max(10000)
    .optional()
    .default(1000)
    .describe('Number of results (1-10000)'),

  offset: z
    .coerce.number()
    .min(0)
    .optional()
    .default(0)
    .describe('Offset for pagination'),

  // Sorting
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .describe('Sort by timestamp (asc=oldest first, desc=newest first)'),
});

export type QueryDeviceStatesDTO = z.infer<typeof queryDeviceStatesSchema>;

// ============================================================================
// Aggregation Queries
// ============================================================================

/**
 * Aggregation function types
 */
export const aggregationFunctionSchema = z.enum([
  'avg',
  'min',
  'max',
  'sum',
  'count',
  'first',
  'last',
]);

export type AggregationFunction = z.infer<typeof aggregationFunctionSchema>;

/**
 * Time bucket intervals for aggregation
 */
export const timeBucketSchema = z.enum([
  '1m',   // 1 minute
  '5m',   // 5 minutes
  '15m',  // 15 minutes
  '1h',   // 1 hour
  '6h',   // 6 hours
  '1d',   // 1 day
  '1w',   // 1 week
]);

export type TimeBucket = z.infer<typeof timeBucketSchema>;

/**
 * Schema for aggregating device states
 * Used for downsampling time-series data
 */
export const aggregateDeviceStatesSchema = z.object({
  // Time range (required for aggregation)
  startTime: z.string().transform((val) => new Date(val)).describe('Start of time range (inclusive)'),
  endTime: z.string().transform((val) => new Date(val)).describe('End of time range (inclusive)'),

  // Aggregation config
  bucket: timeBucketSchema.describe('Time bucket interval'),

  fields: z
    .string()
    .transform((val) => val.split(',').map((f) => f.trim()).filter(Boolean))
    .pipe(
      z.array(z.string().min(1))
        .min(1, 'At least one field is required')
        .max(50, 'Maximum 50 fields')
    )
    .describe('Data fields to aggregate (comma-separated)'),

  functions: z
    .string()
    .transform((val) => val.split(',').map((f) => f.trim()).filter(Boolean))
    .pipe(
      z.array(aggregationFunctionSchema)
        .min(1, 'At least one function is required')
    )
    .describe('Aggregation functions to apply (comma-separated)'),
});

export type AggregateDeviceStatesDTO = z.infer<typeof aggregateDeviceStatesSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Device state response schema
 */
export const deviceStateResponseSchema = z.object({
  id: z.string().uuid(),
  deviceId: ulidSchema,
  data: z.record(z.unknown()),
  timestamp: z.date(),
});

export type DeviceStateResponse = z.infer<typeof deviceStateResponseSchema>;

/**
 * Paginated device states response
 */
export const paginatedDeviceStatesResponseSchema = z.object({
  data: z.array(deviceStateResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type PaginatedDeviceStatesResponse = z.infer<
  typeof paginatedDeviceStatesResponseSchema
>;

/**
 * Aggregated data point
 */
export const aggregatedDataPointSchema = z.object({
  bucket: z.date().describe('Time bucket start'),
  values: z.record(z.number()).describe('Aggregated values per field'),
});

export type AggregatedDataPoint = z.infer<typeof aggregatedDataPointSchema>;

/**
 * Aggregated device states response
 */
export const aggregatedDeviceStatesResponseSchema = z.object({
  deviceId: ulidSchema,
  startTime: z.date(),
  endTime: z.date(),
  bucket: timeBucketSchema,
  data: z.array(aggregatedDataPointSchema),
});

export type AggregatedDeviceStatesResponse = z.infer<
  typeof aggregatedDeviceStatesResponseSchema
>;
