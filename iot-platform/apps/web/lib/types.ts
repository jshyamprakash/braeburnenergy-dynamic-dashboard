// ============================================================================
// Device Types
// ============================================================================

export interface Device {
  id: string;              // UUID (internal)
  deviceId: string;        // ULID (user-facing identifier)
  name: string;
  /** Static metadata key-value pairs (ADR-021) */
  tags: Record<string, string>;
  /** Device data schema: field name → data type (ADR-021) */
  attributes?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceInput {
  deviceId?: string;       // Optional ULID (auto-generated if not provided)
  name: string;
  tags?: Record<string, string>;
  attributes?: Record<string, string>;
}

export interface UpdateDeviceInput {
  name?: string;
  tags?: Record<string, string>;
  attributes?: Record<string, string>;
}

// ============================================================================
// Device State Types
// ============================================================================

export interface DeviceState {
  id: string;              // UUID (internal)
  deviceId: string;        // ULID reference to Device
  data: Record<string, any>;
  derived?: Record<string, any>;
  timestamp: string;
}

export interface CreateDeviceStateInput {
  data: Record<string, any>;
  timestamp?: string;      // Optional (defaults to now)
}

export interface DeviceStateQueryParams {
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// TimescaleDB Aggregation Types
// ============================================================================

export type TimeBucket = '1m' | '5m' | '15m' | '1h' | '6h' | '1d' | '1w';
export type AggregateFunction = 'avg' | 'min' | 'max' | 'sum' | 'count';

export interface AggregateQueryParams {
  startTime: string;
  endTime: string;
  bucket: TimeBucket;
  fields: string[];        // e.g., ['temperature', 'humidity']
  functions: AggregateFunction[];
}

export interface AggregateDataPoint {
  bucket: string;          // ISO timestamp for bucket start
  [key: string]: any;      // Dynamic fields based on query (e.g., avg_temperature, max_humidity)
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface DeviceStateUpdate {
  deviceId: string;
  state: DeviceState;
}

export interface DeviceUpdate {
  deviceId: string;
  device: Device;
}

export type WebSocketEvent =
  | { type: 'device:state:created'; payload: DeviceStateUpdate }
  | { type: 'device:updated'; payload: DeviceUpdate }
  | { type: 'device:deleted'; payload: { deviceId: string } }
  | { type: 'connection:established'; payload: { timestamp: string } };
