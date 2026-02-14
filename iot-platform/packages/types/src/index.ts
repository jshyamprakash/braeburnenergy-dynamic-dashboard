/**
 * Shared TypeScript types for IoT Platform
 *
 * This package provides type definitions shared between frontend and backend
 */

// ===========================
// Core Types
// ===========================

/**
 * Device - IoT device entity
 */
export interface Device {
  id: string;
  deviceId: string;  // ULID - user-facing identifier
  name: string;
  tags: string[];
  attributes: Record<string, any> | null;
  orgId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * DeviceState - Time-series device state data
 */
export interface DeviceState {
  id: string;
  deviceId: string;  // ULID reference
  data: Record<string, any>;
  timestamp: string | Date;
  metadata?: {
    orgId?: string;
    deviceId?: string;
  };
}

/**
 * Organization - Multi-tenancy organization
 */
export interface Organization {
  id: string;
  name: string;
  settings: Record<string, any> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ===========================
// API Response Types
// ===========================

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * API Response Union Type
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ===========================
// Query & Filter Types
// ===========================

/**
 * Device list query parameters
 */
export interface DeviceQuery {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'deviceId' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tags?: string[];
}

/**
 * Device state query parameters
 */
export interface DeviceStateQuery {
  limit?: number;
  offset?: number;
  startTime?: string | Date;
  endTime?: string | Date;
  fields?: string[];
}

// ===========================
// WebSocket Event Types
// ===========================

/**
 * WebSocket device state update event
 */
export interface DeviceStateUpdateEvent {
  deviceId: string;
  data: Record<string, any>;
  timestamp: Date | string;
}

/**
 * WebSocket connection event
 */
export interface WebSocketConnectionEvent {
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
}
