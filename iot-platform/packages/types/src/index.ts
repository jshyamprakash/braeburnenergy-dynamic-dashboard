/**
 * Shared TypeScript types for IoT Platform
 *
 * This package provides type definitions shared between frontend and backend
 */

// ===========================
// Core Types
// ===========================

// ===========================
// Module System (ADR-051)
// ===========================

/** Optional module identifier. SuperAdmin enables/disables via PATCH /api/v1/modules. */
export type LicenseModule = 'combustion_dl' | 'asset_life' | 'be_agent';

/** Singleton document returned by GET /api/v1/modules */
export interface ModuleConfig {
  enabled: LicenseModule[];
}

// ===========================

/** Declares where this device's data originates (ADR-046). One device = one source. */
export type DeviceDataSource = 'gateway' | 'workflow' | 'http';

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
  /** Declares data origin: gateway (Modbus/OPC-UA/MQTT), workflow (derived), http (REST) — ADR-046 */
  dataSource: DeviceDataSource;
  /** Last time a state was received from this device (ADR-041) */
  lastSeenAt?: string | Date;
  orgId?: string;
  applicationId?: string;
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
 * User - Authentication and authorization
 */
export type UserRole = 'SuperAdmin' | 'Admin' | 'Operator' | 'Viewer';

export interface User {
  id: string;                          // MongoDB ObjectId
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword?: boolean;        // true = forced password change on next login
  failedLoginAttempts: number;
  lockedUntil?: string | Date | null;  // Account lock timestamp (if locked)
  lastLogin?: string | Date | null;    // Last login timestamp
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
 * Device offline event (ADR-041) — raised by HeartbeatService when device stops sending data
 */
export interface DeviceOfflineEvent {
  deviceId: string;
  offlineSinceMs: number;
  timestamp: Date | string;
}

/**
 * Workflow node type union — kept in sync with workflow.model.ts (ADR-017)
 */
export type NodeType =
  | 'trigger:deviceStateChange' | 'trigger:scheduled' | 'trigger:manual'
  | 'trigger:alarmTriggered' | 'trigger:webhook' | 'trigger:deviceOffline'  // ADR-041
  | 'condition:comparison' | 'condition:threshold' | 'condition:ifElse'
  | 'condition:timeBased' | 'condition:deviceStatus'
  | 'action:sendNotification' | 'action:updateDevice' | 'action:createAlarm'
  | 'action:callWebhook' | 'action:logMessage' | 'action:updateVariable' | 'action:debug'
  | 'transform:mathOperation' | 'transform:stringOperation'
  | 'transform:aggregation' | 'transform:dataMapping'
  | 'data:modbusRead' | 'data:modbusWrite' | 'data:queryDeviceStates'
  | 'data:storageGet' | 'data:storageSet' | 'data:opcuaRead' | 'data:opcuaWrite'
  | 'logic:function' | 'logic:switch' | 'logic:loop' | 'logic:delay' | 'logic:mutate'
  | 'action:writeDeviceState'
  // Asset Life Management — module: asset_life (ADR-049)
  | 'action:ibmMaximoSync' | 'action:ibmMaximoCreateWorkOrder'
  | 'data:fleetQuery' | 'data:assetLifeCalc';

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
  contextSnapshot?: Record<string, any>;  // Snapshot of variables, workspace, trigger at this step
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

// ===========================
// API Key Types
// ===========================

/**
 * ApiKey - Machine-to-machine authentication token
 */
export interface ApiKey {
  id: string;
  name: string;
  prefix: 'iot_live_' | 'iot_test_';
  permissions: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create API key input
 */
export interface CreateApiKeyInput {
  name: string;
  prefix?: 'iot_live_' | 'iot_test_';
  permissions?: string[];
  expiresAt?: string;
}

/**
 * Update API key input
 */
export interface UpdateApiKeyInput {
  name?: string;
  permissions?: string[];
  expiresAt?: string;
}

// ===========================
// OPC-UA Gateway Types
// ===========================

/**
 * OPC-UA node mapping (field → node ID)
 */
export interface OpcuaNodeMapping {
  field: string;
  nodeId: string;
  dataType?: string;
  scale?: number;
  offset?: number;
  unit?: string;
  description?: string;
}

/**
 * OPC-UA subscription settings
 */
export interface OpcuaSubscriptionSettings {
  publishingInterval?: number;
  maxNotificationsPerPublish?: number;
  priority?: number;
  samplingInterval?: number;
  queueSize?: number;
}

/**
 * OPC-UA gateway
 */
export interface OpcuaGateway {
  id: string;
  name: string;
  description?: string;
  applicationId?: string;
  deviceId: string;
  endpointUrl: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: string;
  username?: string;
  password?: string;
  monitoringMode: 'Polling' | 'Subscription';
  pollingInterval?: number;
  subscriptionSettings?: OpcuaSubscriptionSettings;
  nodeMappings: OpcuaNodeMapping[];
  isActive: boolean;
  isConnected: boolean;
  lastError?: string;
  consecutiveFailures: number;
  totalReads: number;
  successfulReads: number;
  failedReads: number;
  averageResponseTime?: number;
  lastPollTimestamp?: string | Date;
  lastSuccessTimestamp?: string | Date;
  lastErrorTimestamp?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Create OPC-UA gateway input
 */
export interface CreateOpcuaGatewayInput {
  name: string;
  description?: string;
  applicationId?: string;
  deviceId: string;
  endpointUrl: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: string;
  username?: string;
  password?: string;
  monitoringMode: 'Polling' | 'Subscription';
  pollingInterval?: number;
  subscriptionSettings?: OpcuaSubscriptionSettings;
  nodeMappings?: OpcuaNodeMapping[];
}

/**
 * Update OPC-UA gateway input
 */
export interface UpdateOpcuaGatewayInput {
  name?: string;
  description?: string;
  deviceId?: string;
  endpointUrl?: string;
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: string;
  username?: string;
  password?: string;
  monitoringMode?: 'Polling' | 'Subscription';
  pollingInterval?: number;
  subscriptionSettings?: OpcuaSubscriptionSettings;
  nodeMappings?: OpcuaNodeMapping[];
}

/**
 * OPC-UA browse tree node (from server discovery)
 */
export interface OpcuaBrowseNode {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: number;
  hasChildren?: boolean;
}

/**
 * OPC-UA node class constants (IEC 62541-6)
 */
export const OpcuaNodeClass = {
  Unspecified: 0,
  Object: 1,
  Variable: 2,
  Method: 4,
  ObjectType: 8,
  VariableType: 16,
  ReferenceType: 32,
  DataType: 64,
  View: 128,
} as const;

// ===========================
// MQTT Gateway Types
// ===========================

export type MqttQoS = 0 | 1 | 2;
export type MqttPayloadFormat = 'json' | 'raw';
export type MqttGatewayStatus = 'connected' | 'disconnected' | 'error';

export interface MqttTopicMapping {
  topic: string;
  field: string;
  deviceId: string;
  payloadFormat: MqttPayloadFormat;
  jsonPath?: string;
  scale?: number;
  offset?: number;
  unit?: string;
  qos: MqttQoS;
  processingOverrides?: {
    noiseThreshold?: number;
    deltaPercent?: number;
  };
}

export interface MqttGateway {
  id: string;
  name: string;
  description?: string;
  applicationId?: string;
  brokerUrl: string;
  clientId: string;
  keepalive: number;
  connectTimeout: number;
  reconnectPeriod: number;
  auth?: { username?: string; password?: string };
  tls?: { enabled: boolean; rejectUnauthorized?: boolean; caCert?: string; clientCert?: string; clientKey?: string };
  topicMappings: MqttTopicMapping[];
  status: MqttGatewayStatus;
  isActive: boolean;
  lastConnected?: string | Date;
  lastError?: string;
  lastMessageAt?: string | Date;
  totalMessagesReceived: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateMqttGatewayInput {
  name: string;
  description?: string;
  applicationId?: string;
  brokerUrl: string;
  clientId?: string;
  keepalive?: number;
  connectTimeout?: number;
  reconnectPeriod?: number;
  auth?: { username?: string; password?: string };
  tls?: { enabled: boolean; rejectUnauthorized?: boolean; caCert?: string; clientCert?: string; clientKey?: string };
  topicMappings?: MqttTopicMapping[];
}

export interface UpdateMqttGatewayInput {
  name?: string;
  description?: string;
  brokerUrl?: string;
  clientId?: string;
  keepalive?: number;
  connectTimeout?: number;
  reconnectPeriod?: number;
  auth?: { username?: string; password?: string };
  tls?: { enabled: boolean; rejectUnauthorized?: boolean };
  topicMappings?: MqttTopicMapping[];
  isActive?: boolean;
}

// ===========================
// BACnet Gateway Types (ADR-055)
// ===========================

export type BacnetObjectType =
  | 'analogInput' | 'analogOutput' | 'analogValue'
  | 'binaryInput' | 'binaryOutput' | 'binaryValue'
  | 'multiStateInput' | 'multiStateOutput' | 'multiStateValue';

export type BacnetProperty = 'presentValue' | 'statusFlags' | 'description' | 'units';

export interface BacnetObject {
  objectType: BacnetObjectType;
  instanceNumber: number;
  property: BacnetProperty;
  field: string;
  scale?: number;
  offset?: number;
  unit?: string;
  deviceId?: string;
}

export interface BacnetGateway {
  id: string;
  name: string;
  description?: string;
  applicationId?: string;
  host: string;
  port: number;
  broadcastAddress?: string;
  deviceInstance?: number;
  objects: BacnetObject[];
  polling: { enabled: boolean; interval: number; onError: 'continue' | 'stop' };
  deviceMapping: { autoRegister: boolean; deviceIdPrefix?: string };
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string | Date;
  lastError?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateBacnetGatewayInput {
  name: string;
  description?: string;
  applicationId?: string;
  host: string;
  port?: number;
  broadcastAddress?: string;
  deviceInstance?: number;
  objects?: BacnetObject[];
  polling: { enabled: boolean; interval: number; onError?: 'continue' | 'stop' };
  deviceMapping?: { autoRegister: boolean; deviceIdPrefix?: string };
}

export interface UpdateBacnetGatewayInput {
  name?: string;
  description?: string;
  host?: string;
  port?: number;
  objects?: BacnetObject[];
  polling?: Partial<{ enabled: boolean; interval: number; onError: 'continue' | 'stop' }>;
  deviceMapping?: { autoRegister: boolean; deviceIdPrefix?: string };
}

// ===========================
// EtherNet/IP Gateway Types (ADR-056)
// ===========================

export type EnipDataType = 'REAL' | 'DINT' | 'INT' | 'SINT' | 'BOOL' | 'DWORD' | 'WORD' | 'BYTE';

export interface EnipTag {
  tagName: string;
  field: string;
  dataType?: EnipDataType;
  scale?: number;
  offset?: number;
  unit?: string;
  deviceId?: string;
}

export interface EnipGateway {
  id: string;
  name: string;
  description?: string;
  applicationId?: string;
  host: string;
  port: number;
  slot: number;
  timeout: number;
  tags: EnipTag[];
  polling: { enabled: boolean; interval: number; onError: 'continue' | 'stop' };
  deviceMapping: { autoRegister: boolean; deviceIdPrefix?: string };
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string | Date;
  lastError?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateEnipGatewayInput {
  name: string;
  description?: string;
  applicationId?: string;
  host: string;
  port?: number;
  slot?: number;
  timeout?: number;
  tags?: EnipTag[];
  polling: { enabled: boolean; interval: number; onError?: 'continue' | 'stop' };
  deviceMapping?: { autoRegister: boolean; deviceIdPrefix?: string };
}

export interface UpdateEnipGatewayInput {
  name?: string;
  description?: string;
  host?: string;
  port?: number;
  slot?: number;
  tags?: EnipTag[];
  polling?: Partial<{ enabled: boolean; interval: number; onError: 'continue' | 'stop' }>;
  deviceMapping?: { autoRegister: boolean; deviceIdPrefix?: string };
}

/**
 * WorkflowStorageEntry - Persistent key-value storage for workflows (ADR-042)
 */
export interface WorkflowStorageEntry {
  orgId: string;
  key: string;
  value: unknown;
  workflowId?: string;
  expiresAt?: Date;
  updatedAt: Date;
}

/**
 * Notification - Workflow-triggered or system notification
 */
export interface Notification {
  _id?: string;
  notificationId: string;
  orgId?: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: 'workflow' | 'system';
  workflowId?: string;
  workflowName?: string;
  read: boolean;
  createdAt: string | Date;
}

/**
 * Notification list response
 */
export interface NotificationListResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

/**
 * Dashboard - Kosmos unified dashboard with user-based sharing (ADR-045)
 */
export interface Dashboard {
  id: string;
  dashboardId: string;      // ULID - user-facing identifier
  applicationId: string;    // Required parent (ADR-036)
  orgId?: string;           // MongoDB ObjectId
  name: string;
  description?: string;
  blocks?: any[];           // Legacy react-grid-layout blocks
  layouts?: Record<string, any>;
  pages?: any[];            // Kosmos pages with unified widgets[]
  sharedWithUsers: string[]; // List of User ObjectIds with viewer access (ADR-045)
  createdAt: string | Date;
  updatedAt: string | Date;
}
