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
  /** Static metadata key-value pairs (ADR-021) */
  tags: Record<string, string>;
  /** Device data schema: field name → data type (ADR-021) */
  attributes: Record<string, string> | null;
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
  derived?: Record<string, any>; // Workflow-derived values (ADR-028); absent when no workflow has run
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

/**
 * Application - Top-level project container per ADR-023
 */
export interface Application {
  id: string;
  applicationId: string;  // ULID - user-facing identifier
  orgId: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Create Application input
 */
export interface CreateApplicationInput {
  name: string;
  description?: string;
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

/**
 * Workflow node type union — kept in sync with workflow.model.ts (ADR-017)
 */
export type NodeType =
  | 'trigger:deviceStateChange' | 'trigger:scheduled' | 'trigger:manual'
  | 'trigger:alarmTriggered' | 'trigger:webhook'
  | 'condition:comparison' | 'condition:threshold' | 'condition:ifElse'
  | 'condition:timeBased' | 'condition:deviceStatus'
  | 'action:sendNotification' | 'action:updateDevice' | 'action:createAlarm'
  | 'action:callWebhook' | 'action:logMessage' | 'action:updateVariable' | 'action:debug'
  | 'transform:mathOperation' | 'transform:stringOperation'
  | 'transform:aggregation' | 'transform:dataMapping'
  | 'data:modbusRead' | 'data:modbusWrite' | 'data:queryDeviceStates'
  | 'logic:function';

/**
 * Workflow type (deployment target/use case)
 */
export type WorkflowType = 'Application' | 'Experience' | 'Embedded' | 'Edge';

/**
 * Workflow priority level
 */
export type WorkflowPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Workflow node (canvas element)
 */
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label?: string;
    description?: string;
    config: Record<string, any>;
  };
}

/**
 * Workflow edge (connection between nodes)
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: 'default' | 'smoothstep' | 'step';
}

/**
 * Workflow schedule (for scheduled triggers)
 */
export interface WorkflowSchedule {
  cronExpression?: string;
  timezone?: string;
  nextRunAt?: string | Date;
}

/**
 * Workflow definition and metadata
 */
export interface Workflow {
  workflowId: string;  // ULID - user-facing identifier
  name: string;
  type: WorkflowType;
  description?: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isEnabled: boolean;
  priority: WorkflowPriority;
  maxConcurrentExecutions: number;
  timeoutSeconds: number;
  schedule?: WorkflowSchedule;
  executionCount: number;
  lastExecutedAt?: string | Date;
  lastExecutionStatus?: 'completed' | 'failed' | 'timeout' | 'cancelled';
  lastExecutionDuration?: number;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Workflow execution step event (per-node progress)
 */
export interface WorkflowExecutionStepEvent {
  executionId: string;
  workflowId: string;
  orgId: string;
  nodeId: string;
  nodeType: string;
  status: 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
  duration?: number;
  timestamp?: Date | string;
  notes?: string;
}

/**
 * Workflow execution completion event
 */
export interface WorkflowExecutionCompletedEvent {
  executionId: string;
  workflowId: string;
  orgId: string;
  status: 'completed' | 'failed';
  duration: number;
  outputData?: any;
  error?: {
    message: string;
    nodeId: string;
  };
  timestamp?: Date | string;
}

/**
 * Real-time debug message from action:debug node
 */
export interface WorkflowDebugMessageEvent {
  workflowId: string;
  executionId: string;
  orgId: string;
  nodeId: string;
  nodeLabel: string;
  level: string;
  message: string;
  rawData: any;
  timestamp: string;
}

// ===========================
// Modbus Gateway Types
// ===========================

/**
 * Modbus gateway connection configuration
 */
export interface ModbusConnection {
  host?: string;              // TCP: hostname/IP
  port?: number;              // TCP: port (default 502)
  serialPort?: string;        // RTU: /dev/ttyUSB0 or COM3
  baudRate?: number;          // RTU: 9600, 19200, etc
  unitId: number;             // Modbus slave ID (1-247)
}

/**
 * Modbus polling configuration
 */
export interface ModbusPolling {
  enabled: boolean;
  interval: number;           // milliseconds
}

/**
 * Modbus register mapping
 */
export interface ModbusRegister {
  name: string;
  address: number;
  type: 'holding' | 'input' | 'coil' | 'discrete';
  dataType: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float' | 'boolean';
  deviceId?: string;          // Optional: map to device
  scale?: number;
  offset?: number;
  unit?: string;
}

/**
 * Modbus gateway entity
 */
export interface ModbusGateway {
  id: string;
  gatewayId?: string;         // ULID if stored
  name: string;
  description?: string;
  applicationId?: string;     // ADR-036: scoped to application
  protocol: 'tcp' | 'rtu';
  connection: ModbusConnection;
  polling: ModbusPolling;
  registers: ModbusRegister[];
  deviceMapping?: { autoRegister: boolean; deviceIdPrefix?: string };
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string | Date;
  lastError?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Create Modbus gateway input
 */
export interface CreateModbusGatewayInput {
  name: string;
  description?: string;
  applicationId?: string;
  protocol: 'tcp' | 'rtu';
  connection: ModbusConnection;
  polling: ModbusPolling;
  registers?: ModbusRegister[];
  deviceMapping?: { autoRegister: boolean; deviceIdPrefix?: string };
}

/**
 * Update Modbus gateway input
 */
export interface UpdateModbusGatewayInput {
  name?: string;
  description?: string;
  protocol?: 'tcp' | 'rtu';
  connection?: Partial<ModbusConnection>;
  polling?: Partial<ModbusPolling>;
  registers?: ModbusRegister[];
  deviceMapping?: { autoRegister: boolean; deviceIdPrefix?: string };
}
