import vm from 'vm';
import type { Server as SocketIOServer } from 'socket.io';
import { WorkflowNode } from '../models/workflow.model';
import { ModbusGateway } from '../models/modbus-gateway.model';
import { ModbusClientService } from './modbus-client.service';
import { DeviceService } from './device.service';
import { deviceStateService } from './device-state.service';
import { deviceDerivedStateService } from './device-derived-state.service';
import { modbusGatewayManager } from './modbus-gateway-manager.service';
import { notificationService } from './notification.service';
import { DEFAULT_ORG_ID } from '../lib/request-context';
import { parseGenericCsv, GenericCsvData } from '../lib/combustion-csv-utils';
import { broadcastDeviceState, broadcastWorkflowWorkspace } from '../websocket/server.js';

// ─── Streaming abort registry ─────────────────────────────────────────────────
const _streamAbortRegistry = new Map<string, AbortController>();

export function abortWorkflowStreams(workflowId: string): void {
  const ctrl = _streamAbortRegistry.get(workflowId);
  if (ctrl) {
    ctrl.abort();
    _streamAbortRegistry.delete(workflowId);
  }
}

/**
 * Node execution result
 */
export interface NodeExecutionResult {
  output?: any;                    // Output data to pass to next node
  conditionMet?: boolean;          // For condition nodes (true/false branch)
  switchBranch?: string;           // For logic:switch nodes (branch handle name)
  variables?: Record<string, any>; // Variables to update in context
  notes?: string;                  // Human-readable info for debug panel (e.g. log message text)
  debugMessage?: {                 // For action:debug node real-time output
    level: string;
    message: string;
    data: any;
    nodeLabel: string;
  };
  /** When set, the engine broadcasts a device:state update via WebSocket */
  broadcastState?: {
    deviceId: string;
    data: Record<string, any>;
    derived: Record<string, any>;
    timestamp: Date | string;
  };
  /** When true, engine skips downstream traversal (self-streaming nodes drive it per-tick) */
  skipDownstream?: boolean;
}

/**
 * Resolve template expressions
 * Replaces {{varName}} or {{path.to.value}} with resolved context values
 * Returns original value if it's not a string or has no expressions
 *
 * @param value - Template string or any value
 * @param context - Workflow execution context
 * @returns Resolved value
 */
export function resolveExpression(value: any, context: Record<string, any>): any {
  // Non-strings pass through as-is (preserves arrays, objects, numbers)
  if (typeof value !== 'string') return value;

  // Single {{path}} token with no surrounding text — return the raw value.
  // This preserves arrays and objects so WriteDeviceState can store json-typed attributes.
  const exactMatch = value.match(/^\{\{([^}]+)\}\}$/);
  if (exactMatch) {
    const parts = exactMatch[1].trim().split('.');
    let resolved: any = context;
    for (const part of parts) {
      if (resolved == null) return value;
      resolved = resolved[part];
    }
    return resolved !== undefined ? resolved : value;
  }

  // Template string with surrounding text — string interpolation as before
  return value.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
    const parts = path.trim().split('.');
    let resolved: any = context;
    for (const part of parts) {
      if (resolved == null) return _match;
      resolved = resolved[part];
    }
    return resolved != null ? String(resolved) : _match;
  });
}

/**
 * Cast a resolved expression value to the specified type (ADR-022)
 * Supported types: "number", "string", "boolean", "timestamp"
 */
function castValue(value: any, type?: string): any {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return Boolean(value);
  if (type === 'timestamp') return new Date(value).toISOString();
  if (type === 'string') return String(value);
  if (type === 'json') {
    // Parse if already stringified (edge case), otherwise pass array/object through
    if (typeof value === 'string') { try { return JSON.parse(value); } catch { return value; } }
    return value;
  }
  // No explicit type: preserve the native JS type
  return value;
}

/**
 * WorkflowNodeHandlers
 *
 * Implements execution logic for each node type:
 * - Triggers: deviceStateChange, scheduled, manual, alarmTriggered, webhook
 * - Conditions: comparison, threshold, ifElse, timeBased, deviceStatus
 * - Actions: sendNotification, updateDevice, createAlarm, callWebhook, logMessage, updateVariable
 * - Transformations: mathOperation, stringOperation, aggregation, dataMapping
 */
export class WorkflowNodeHandlers {
  private deviceService: DeviceService;
  private io?: SocketIOServer;

  constructor(io?: SocketIOServer) {
    this.deviceService = new DeviceService();
    this.io = io;
  }

  /**
   * Route to node-specific handler
   */
  async execute(node: WorkflowNode, context: any): Promise<NodeExecutionResult> {
    const config = node.data.config;

    switch (node.type) {
      // Triggers (passthrough - validation only)
      case 'trigger:deviceStateChange':
      case 'trigger:scheduled':
      case 'trigger:manual':
      case 'trigger:alarmTriggered':
      case 'trigger:webhook':
      case 'trigger:deviceOffline': // ADR-041
        return this.executeTrigger(config, context);

      // Conditions
      case 'condition:comparison':
        return this.executeConditionComparison(config, context);
      case 'condition:threshold':
        return this.executeConditionThreshold(config, context);
      case 'condition:ifElse':
        return this.executeConditionIfElse(config, context);
      case 'condition:timeBased':
        return this.executeConditionTimeBased(config, context);
      case 'condition:deviceStatus':
        return this.executeConditionDeviceStatus(config, context);

      // Actions
      case 'action:sendNotification':
        return this.executeActionSendNotification(config, context);
      case 'action:updateDevice':
        return this.executeActionUpdateDevice(config, context);
      case 'action:createAlarm':
        return this.executeActionCreateAlarm(config, context);
      case 'action:callWebhook':
        return this.executeActionCallWebhook(config, context);
      case 'action:logMessage':
        return this.executeActionLogMessage(config, context);
      case 'action:updateVariable':
        return this.executeActionUpdateVariable(config, context);
      case 'action:debug':
        return this.executeActionDebug(config, context, node.data?.label);

      // Transformations
      case 'transform:mathOperation':
        return this.executeTransformMathOperation(config, context);
      case 'transform:stringOperation':
        return this.executeTransformStringOperation(config, context);
      case 'transform:aggregation':
        return this.executeTransformAggregation(config, context);
      case 'transform:dataMapping':
        return this.executeTransformDataMapping(config, context);

      // Data (ADR-017)
      case 'data:modbusRead':
        return this.executeDataModbusRead(config, context);
      case 'data:modbusWrite':
        return this.executeDataModbusWrite(config, context);
      case 'data:queryDeviceStates':
        return this.executeDataQueryDeviceStates(config, context);
      case 'data:storageGet':
        return this.executeDataStorageGet(config, context);
      case 'data:storageSet':
        return this.executeDataStorageSet(config, context);
      case 'data:opcuaRead':
        return this.executeDataOpcuaRead(config, context);
      case 'data:opcuaWrite':
        return this.executeDataOpcuaWrite(config, context);

      // Logic (ADR-017)
      case 'logic:function':
        return this.executeLogicFunction(config, context);
      case 'logic:switch':
        return this.executeLogicSwitch(config, context);
      case 'logic:delay':
        return this.executeLogicDelay(config, context);
      case 'logic:mutate':
        return this.executeLogicMutate(config, context);
      case 'logic:loop':
        return this.executeLogicLoop(config, context);

      // Action: write structured data back to DeviceState (ADR-022)
      case 'action:writeDeviceState':
        return this.executeActionWriteDeviceState(config, context);

      // Asset Life Management — stub handlers (ADR-049, module: asset_life)
      case 'action:ibmMaximoSync':
        return this.executeActionIbmMaximoSync(config, context);
      case 'action:ibmMaximoCreateWorkOrder':
        return this.executeActionIbmMaximoCreateWorkOrder(config, context);
      case 'data:fleetQuery':
        return this.executeDataFleetQuery(config, context);
      case 'data:assetLifeCalc':
        return this.executeDataAssetLifeCalc(config, context);

      // Combustion DL CSV playback (module: combustion_dl)
      case 'action:combustionCsvPlayer':
        return this.executeActionCombustionCsvPlayer(config, context);

      // Generic CSV Stream Player (module: combustion_dl)
      case 'action:csvStreamPlayer':
        return this.executeCsvStreamPlayer(config, context);

      // Ephemeral workspace broadcast — maps workflow fields to named keys, no DB write
      case 'action:setWorkspace':
        return this.executeSetWorkspace(node, context);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  // ==========================================================================
  // Triggers
  // ==========================================================================

  private async executeTrigger(_config: any, context: any): Promise<NodeExecutionResult> {
    // Triggers just pass through the trigger data
    return {
      output: context.currentData,
    };
  }

  // ==========================================================================
  // Conditions
  // ==========================================================================

  private async executeConditionComparison(config: any, context: any): Promise<NodeExecutionResult> {
    const { field, operator, value } = config;

    // Get value from current data
    const currentValue = this.getNestedValue(context.currentData, field);

    let conditionMet = false;

    switch (operator) {
      case '>':
      case 'GREATER_THAN':
        conditionMet = currentValue > value;
        break;
      case '>=':
      case 'GREATER_EQUAL':
        conditionMet = currentValue >= value;
        break;
      case '<':
      case 'LESS_THAN':
        conditionMet = currentValue < value;
        break;
      case '<=':
      case 'LESS_EQUAL':
        conditionMet = currentValue <= value;
        break;
      case '==':
      case 'EQUAL':
        conditionMet = currentValue === value;
        break;
      case '!=':
      case 'NOT_EQUAL':
        conditionMet = currentValue !== value;
        break;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }

    return {
      output: context.currentData, // Pass through
      conditionMet,
    };
  }

  private async executeConditionThreshold(config: any, context: any): Promise<NodeExecutionResult> {
    const { field, min, max } = config;

    const currentValue = this.getNestedValue(context.currentData, field);

    let conditionMet = true;

    if (min !== undefined && currentValue < min) {
      conditionMet = false;
    }

    if (max !== undefined && currentValue > max) {
      conditionMet = false;
    }

    return {
      output: context.currentData,
      conditionMet,
    };
  }

  private async executeConditionIfElse(config: any, context: any): Promise<NodeExecutionResult> {
    const { expression } = config;

    // Simple expression evaluation (can be enhanced with a library like jsonpath)
    // For MVP, support simple comparisons like "temperature > 80"
    const conditionMet = this.evaluateExpression(expression, context.currentData);

    return {
      output: context.currentData,
      conditionMet,
    };
  }

  private async executeConditionTimeBased(config: any, context: any): Promise<NodeExecutionResult> {
    const { startHour, endHour } = config;

    const now = new Date();
    const currentHour = now.getHours(); // TODO: Handle timezone

    const conditionMet = currentHour >= startHour && currentHour <= endHour;

    return {
      output: context.currentData,
      conditionMet,
    };
  }

  private async executeConditionDeviceStatus(config: any, context: any): Promise<NodeExecutionResult> {
    const { status } = config;

    // Check device status (online/offline/error)
    // For MVP, assume devices are always online
    const conditionMet = status === 'online';

    return {
      output: context.currentData,
      conditionMet,
    };
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  private async executeActionSendNotification(config: any, context: any): Promise<NodeExecutionResult> {
    const { title = 'Workflow Notification', message = '', severity = 'INFO' } = config;

    const resolvedTitle = resolveExpression(title, context);
    const resolvedMessage = resolveExpression(message, context);

    const notification = await notificationService.create(DEFAULT_ORG_ID, {
      title: String(resolvedTitle),
      message: String(resolvedMessage),
      severity,
      source: 'workflow',
      workflowId: context.workflowId,
      workflowName: context.workflowName,
    });

    // Broadcast via Socket.io so the frontend bell updates in real time
    if (this.io) {
      this.io.emit('notification:new', { notification });
    }

    return {
      output: {
        notificationSent: true,
        notificationId: notification.notificationId,
      },
    };
  }

  private async executeActionUpdateDevice(config: any, context: any): Promise<NodeExecutionResult> {
    const { deviceId, updates } = config;

    // Update device attributes
    // Note: orgId would need to be passed in context for multi-tenancy
    const ORG_ID = DEFAULT_ORG_ID;

    try {
      await this.deviceService.update(ORG_ID, deviceId, {
        attributes: updates as Record<string, 'string' | 'number' | 'boolean' | 'timestamp'>,
      });

      return {
        output: {
          ...context.currentData,
          deviceUpdated: deviceId,
          updates,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to update device ${deviceId}: ${error.message}`);
    }
  }

  private async executeActionCreateAlarm(config: any, context: any): Promise<NodeExecutionResult> {
    // NodeConfigPanel uses `severity`; legacy config uses `priority`
    const { severity, priority, message, alarmRuleId, deviceId: configDeviceId, field: configField } = config;
    const resolvedPriority = ((severity || priority || 'MEDIUM') as string).toUpperCase();

    // Resolve template expressions in message
    const resolveCtx = { ...context.currentData, ...context };
    const resolvedMessage = this.interpolateString(message || 'Workflow alarm triggered', resolveCtx);

    // Derive device/field from config or trigger context
    const deviceId = configDeviceId || context.trigger?.deviceId || context.currentData?.deviceId || 'unknown';
    const field = configField || context.trigger?.field || context.currentData?.field || 'unknown';
    const triggerValue = context.trigger?.value ?? context.currentData?.value ?? 0;

    try {
      const { AlarmRule } = await import('../models/alarm-rule.model');
      const { AlarmInstance } = await import('../models/alarm-instance.model');

      // 1. Resolve alarm rule
      let rule: any = null;
      if (alarmRuleId) {
        const { default: mongoose } = await import('mongoose');
        if (mongoose.Types.ObjectId.isValid(alarmRuleId)) {
          rule = await AlarmRule.findById(alarmRuleId).lean();
        }
      }
      if (!rule) {
        rule = await AlarmRule.findOne({ deviceId, field, isEnabled: true }).lean();
      }
      if (!rule) {
        // Create a minimal on-the-fly rule so AlarmInstance has a valid reference
        const safeTag = `WF-${deviceId.slice(-8)}-${field.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}`;
        const newRule = new AlarmRule({
          name: `Workflow: ${resolvedMessage.slice(0, 80)}`,
          tagName: safeTag,
          deviceId,
          field,
          conditionType: 'THRESHOLD',
          operator: 'GREATER_THAN',
          parameters: { threshold: 0 },
          priority: resolvedPriority as any,
          requiresAcknowledgment: true,
          notificationChannels: ['websocket'],
          isActive: true,
          isEnabled: true,
          isShelved: false,
        });
        rule = await newRule.save();
      }

      // 2. Create alarm instance
      const alarm = new AlarmInstance({
        alarmRuleId: rule._id,
        tagName: rule.tagName,
        deviceId,
        field,
        triggerValue,
        triggerTimestamp: new Date(),
        triggerStateId: context.trigger?.stateId || context.currentData?.stateId,
        state: 'ACTIVE_UNACKED',
        priority: resolvedPriority as any,
        requiresAcknowledgment: true,
        activeTimestamp: new Date(),
        isShelved: false,
        notificationsSent: [],
        stateTransitions: [{
          fromState: null,
          toState: 'ACTIVE_UNACKED',
          timestamp: new Date(),
        }],
      });
      await alarm.save();

      console.log(`[ALARM] Created [${resolvedPriority}] for device=${deviceId} field=${field}: ${resolvedMessage}`);

      return {
        output: {
          ...context.currentData,
          alarmCreated: true,
          alarmId: alarm._id.toString(),
          alarmPriority: resolvedPriority,
          alarmMessage: resolvedMessage,
        },
        notes: `🚨 Alarm created [${resolvedPriority}]: ${resolvedMessage}`,
      };
    } catch (error: any) {
      console.error(`[ALARM] Failed to create alarm:`, error.message);
      return {
        output: {
          ...context.currentData,
          alarmCreated: false,
          alarmError: error.message,
        },
        notes: `⚠️ Failed to create alarm: ${error.message}`,
      };
    }
  }

  private async executeActionCallWebhook(config: any, context: any): Promise<NodeExecutionResult> {
    const { method, headers, body, bodyTemplate, timeoutMs } = config;

    // Merge context for variable resolution
    const resolveCtx = { ...context.currentData, ...context };

    // T1+T2: Resolve and validate URL
    const resolvedUrl: string = resolveExpression(config.url, resolveCtx);
    if (!resolvedUrl || !/^https?:\/\//i.test(resolvedUrl)) {
      throw new Error(`Webhook URL is invalid or missing: "${resolvedUrl}"`);
    }

    // T3: Resolve header values
    const resolvedHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (headers && typeof headers === 'object') {
      for (const [k, v] of Object.entries(headers)) {
        resolvedHeaders[k] = resolveExpression(v, resolveCtx);
      }
    }

    // T4: Resolve body
    let resolvedBody: string;
    if (bodyTemplate && typeof bodyTemplate === 'string') {
      resolvedBody = resolveExpression(bodyTemplate, resolveCtx);
    } else if (body !== undefined && body !== null) {
      resolvedBody = JSON.stringify(body);
    } else {
      resolvedBody = JSON.stringify(context.currentData);
    }

    // T5: Timeout via AbortController
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(resolvedUrl, {
        method: method || 'POST',
        headers: resolvedHeaders,
        body: resolvedBody,
        signal: controller.signal,
      });

      // T6: Handle non-JSON responses
      let responseData: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        output: {
          ...context.currentData,
          webhookResponse: responseData,
          webhookStatus: response.status,
        },
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Webhook call timed out after ${timeout}ms`);
      }
      throw new Error(`Webhook call failed: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private async executeActionLogMessage(config: any, context: any): Promise<NodeExecutionResult> {
    const { message, level } = config;

    const interpolatedMessage = this.interpolateString(message, context.currentData);

    // Log message (can integrate with logging service)
    console.log(`[WORKFLOW LOG] [${level || 'INFO'}] ${interpolatedMessage}`);

    return {
      output: context.currentData,
      notes: `[${level || 'INFO'}] ${interpolatedMessage}`,
    };
  }

  private async executeActionUpdateVariable(config: any, context: any): Promise<NodeExecutionResult> {
    const { variableName, value, source } = config;

    let variableValue = value;

    if (source === 'field') {
      variableValue = this.getNestedValue(context.currentData, value);
    }

    return {
      output: context.currentData,
      variables: {
        [variableName]: variableValue,
      },
    };
  }

  private async executeActionDebug(config: any, context: any, nodeLabel?: string): Promise<NodeExecutionResult> {
    const { messageTemplate, level = 'DEBUG' } = config;

    // Merge currentData into root so {{trigger.value}} and {{computed.x}} both resolve
    const resolveCtx = { ...context.currentData, ...context };
    const resolvedMessage = messageTemplate
      ? this.interpolateString(messageTemplate, resolveCtx)
      : JSON.stringify(context.currentData, null, 2);

    // Will be captured by engine and emitted as workflow:debug:message WebSocket event
    return {
      output: context.currentData,
      notes: resolvedMessage,
      debugMessage: {
        level,
        message: resolvedMessage,
        data: context.currentData,
        nodeLabel: nodeLabel || 'Debug',
      },
    };
  }

  // ==========================================================================
  // Transformations
  // ==========================================================================

  private async executeTransformMathOperation(config: any, context: any): Promise<NodeExecutionResult> {
    const { field, operation, value, outputField } = config;

    const currentValue = this.getNestedValue(context.currentData, field);

    let result: number;

    switch (operation) {
      case 'add':
        result = currentValue + value;
        break;
      case 'subtract':
        result = currentValue - value;
        break;
      case 'multiply':
        result = currentValue * value;
        break;
      case 'divide':
        result = currentValue / value;
        break;
      default:
        throw new Error(`Unknown math operation: ${operation}`);
    }

    // Set result in output
    const output = { ...context.currentData };
    this.setNestedValue(output, outputField || field, result);

    return { output };
  }

  private async executeTransformStringOperation(config: any, context: any): Promise<NodeExecutionResult> {
    const { field, operation, value, outputField } = config;

    const currentValue = String(this.getNestedValue(context.currentData, field));

    let result: string;

    switch (operation) {
      case 'uppercase':
        result = currentValue.toUpperCase();
        break;
      case 'lowercase':
        result = currentValue.toLowerCase();
        break;
      case 'concat':
        result = currentValue + value;
        break;
      case 'replace':
        result = currentValue.replace(value.pattern, value.replacement);
        break;
      default:
        throw new Error(`Unknown string operation: ${operation}`);
    }

    const output = { ...context.currentData };
    this.setNestedValue(output, outputField || field, result);

    return { output };
  }

  private async executeTransformAggregation(config: any, context: any): Promise<NodeExecutionResult> {
    const { field, operation, outputField } = config;

    const values = this.getNestedValue(context.currentData, field);

    if (!Array.isArray(values)) {
      throw new Error(`Field ${field} is not an array`);
    }

    let result: number;

    switch (operation) {
      case 'sum':
        result = values.reduce((acc, val) => acc + val, 0);
        break;
      case 'average':
        result = values.reduce((acc, val) => acc + val, 0) / values.length;
        break;
      case 'min':
        result = Math.min(...values);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      default:
        throw new Error(`Unknown aggregation operation: ${operation}`);
    }

    const output = { ...context.currentData };
    this.setNestedValue(output, outputField || field, result);

    return { output };
  }

  private async executeTransformDataMapping(config: any, context: any): Promise<NodeExecutionResult> {
    const { mappings } = config;

    // Apply field mappings
    // mappings: [{ from: 'temp', to: 'temperature' }, ...]
    const output: any = {};

    for (const mapping of mappings) {
      const value = this.getNestedValue(context.currentData, mapping.from);
      this.setNestedValue(output, mapping.to, value);
    }

    return { output };
  }

  // ==========================================================================
  // Data Nodes (ADR-017)
  // ==========================================================================

  private async executeDataModbusRead(config: any, context: any): Promise<NodeExecutionResult> {
    const { gatewayId, registerName, outputField = 'modbusData' } = config;

    const value = await modbusGatewayManager.readRegister(gatewayId, registerName);

    return {
      output: {
        ...context.currentData,
        [outputField]: value,
      },
    };
  }

  private async executeDataModbusWrite(config: any, context: any): Promise<NodeExecutionResult> {
    const { gatewayId, startAddress, values } = config;

    const gateway = await ModbusGateway.findById(gatewayId).lean();
    if (!gateway) {
      throw new Error(`Modbus gateway not found: ${gatewayId}`);
    }

    const client = new ModbusClientService();
    await client.connect(gateway.connection);
    try {
      await client.writeRegisters(startAddress, values);
    } finally {
      await client.disconnect();
    }

    return {
      output: {
        ...context.currentData,
        modbusWriteSuccess: true,
        writtenAddress: startAddress,
        writtenValues: values,
      },
    };
  }

  private async executeDataQueryDeviceStates(config: any, context: any): Promise<NodeExecutionResult> {
    const { deviceId, startTime, endTime, limit = 100, outputField = 'deviceStates' } = config;

    const ORG_ID = DEFAULT_ORG_ID;

    const result = await deviceStateService.getStates(ORG_ID, deviceId, {
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      limit: Number(limit) || 100,
      offset: 0,
      sortOrder: 'desc',
    });

    return {
      output: {
        ...context.currentData,
        [outputField]: result.data,
      },
    };
  }

  /**
   * data:storageGet: Retrieve value from persistent workflow storage
   * Config: { key: string, outputField: string, defaultValue?: any }
   */
  private async executeDataStorageGet(config: any, context: any): Promise<NodeExecutionResult> {
    const { key, defaultValue = null, deviceId } = config;

    const { WorkflowStorage } = await import('../models/workflow-storage.model');
    const orgId = DEFAULT_ORG_ID;
    const scopeQuery: Record<string, any> = { orgId, workflowId: context.workflowId, key };
    if (deviceId) scopeQuery.deviceId = deviceId;

    try {
      const entry = await WorkflowStorage.findOne(scopeQuery).lean();

      // Check if entry exists and hasn't expired
      if (entry && (!entry.expiresAt || new Date(entry.expiresAt) > new Date())) {
        return {
          output: {
            ...context.currentData,
            [key]: entry.value,
          },
        };
      }

      // Entry doesn't exist or expired, use default value
      return {
        output: {
          ...context.currentData,
          [key]: defaultValue,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get storage value for key ${key}: ${error.message}`);
    }
  }

  /**
   * data:storageSet: Store value in persistent workflow storage
   * Config: { key: string, value: any|string (expression), ttlSeconds?: number }
   */
  private async executeDataStorageSet(config: any, context: any): Promise<NodeExecutionResult> {
    const { key, valueExpression: value, ttlSeconds, deviceId } = config;

    const { WorkflowStorage } = await import('../models/workflow-storage.model');
    const orgId = DEFAULT_ORG_ID;
    const scopeQuery: Record<string, any> = { orgId, workflowId: context.workflowId, key };
    if (deviceId) scopeQuery.deviceId = deviceId;

    try {
      // Resolve value from expression if it's a string with {{...}} syntax
      let resolvedValue: any;
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const fieldPath = value.slice(2, -2).trim();
        resolvedValue = this.getNestedValue(context.currentData, fieldPath);
      } else {
        resolvedValue = value;
      }

      // Build update object
      const updateData: any = {
        value: resolvedValue,
        updatedAt: new Date(),
      };

      // Add expiration if TTL specified
      if (ttlSeconds && typeof ttlSeconds === 'number') {
        updateData.expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      } else {
        // Remove expiration if not specified
        updateData.expiresAt = null;
      }

      // Upsert (create or update)
      await WorkflowStorage.findOneAndUpdate(
        scopeQuery,
        { $set: updateData },
        { upsert: true, new: true }
      ).lean();

      return {
        output: {
          ...context.currentData,
          storageSetResult: {
            key,
            value: resolvedValue,
          },
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to set storage value for key ${key}: ${error.message}`);
    }
  }

  /**
   * data:opcuaRead: Read value from OPC-UA node
   * Config: { gatewayId: string, nodeId: string, outputField?: string }
   */
  private async executeDataOpcuaRead(config: any, context: any): Promise<NodeExecutionResult> {
    const { gatewayId, nodeId, outputField = 'opcuaValue' } = config;

    try {
      const { opcuaGatewayManager } = await import('./opcua-gateway-manager.service');
      const value = await opcuaGatewayManager.readNode(gatewayId, nodeId);

      return {
        output: {
          ...context.currentData,
          [outputField]: value,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to read OPC-UA node ${nodeId}: ${error.message}`);
    }
  }

  /**
   * data:opcuaWrite: Write value to OPC-UA node
   * Config: { gatewayId: string, nodeId: string, value: any|string (expression) }
   */
  private async executeDataOpcuaWrite(config: any, context: any): Promise<NodeExecutionResult> {
    const { gatewayId, nodeId, value } = config;

    try {
      // Resolve value from expression if it's a string with {{...}} syntax
      let resolvedValue: any;
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const fieldPath = value.slice(2, -2).trim();
        resolvedValue = this.getNestedValue(context.currentData, fieldPath);
      } else {
        resolvedValue = value;
      }

      const { opcuaGatewayManager } = await import('./opcua-gateway-manager.service');
      await opcuaGatewayManager.writeNode(gatewayId, nodeId, resolvedValue);

      return {
        output: {
          ...context.currentData,
          opcuaWriteResult: {
            nodeId,
            value: resolvedValue,
            success: true,
          },
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to write OPC-UA node ${nodeId}: ${error.message}`);
    }
  }

  // ==========================================================================
  // Logic Nodes (ADR-017)
  // ==========================================================================

  private async executeLogicFunction(config: any, context: any): Promise<NodeExecutionResult> {
    const { code, outputField = 'computed' } = config;

    const sandbox: Record<string, any> = {
      data: { ...context.currentData },
      context: { ...context },
      result: {} as Record<string, any>,
    };

    // Wrap user code in a function so both `return {...}` and `result = {...}` work.
    // The function expression is evaluated in the sandbox scope, so `data`, `context`,
    // and `result` are all accessible as free variables.
    const fn = vm.runInNewContext(`(function() { ${code} })`, sandbox, { timeout: 3000 });
    const returnValue = fn();
    if (returnValue !== undefined && typeof returnValue === 'object' && returnValue !== null) {
      sandbox.result = returnValue;
    }

    return {
      output: {
        ...context.currentData,
        [outputField]: sandbox.result,
      },
    };
  }

  /**
   * logic:switch: Branch execution based on expression value
   * Config: { expression: string, cases: [{ match: string, handle: string }, ...], defaultHandle?: string }
   */
  private async executeLogicSwitch(config: any, context: any): Promise<NodeExecutionResult> {
    const { expression, cases = [], defaultHandle } = config;

    // Resolve expression from context.currentData
    let resolvedValue: any;

    if (typeof expression === 'string' && expression.startsWith('{{') && expression.endsWith('}}')) {
      // Extract field path from {{fieldPath}} syntax
      const fieldPath = expression.slice(2, -2).trim();
      resolvedValue = this.getNestedValue(context.currentData, fieldPath);
    } else {
      // Use expression as literal value
      resolvedValue = expression;
    }

    // Convert to string for comparison
    const valueStr = String(resolvedValue);

    // Find matching case
    let matchedHandle: string | undefined;
    for (const caseItem of cases) {
      if (String(caseItem.match) === valueStr) {
        matchedHandle = caseItem.handle;
        break;
      }
    }

    // Use matched handle or fall back to default
    const branch = matchedHandle || defaultHandle || 'default';

    return {
      output: context.currentData,
      switchBranch: branch,
    };
  }

  /**
   * logic:delay: Pause execution for specified duration
   * Config: { delayMs: number }
   */
  private async executeLogicDelay(config: any, context: any): Promise<NodeExecutionResult> {
    const { delayMs = 0 } = config;

    // Clamp delay to [0, 30000]
    const clampedDelay = Math.max(0, Math.min(30000, Number(delayMs) || 0));

    // Wait for specified duration
    await new Promise(resolve => setTimeout(resolve, clampedDelay));

    return {
      output: {
        ...context.currentData,
        delayed: clampedDelay,
      },
    };
  }

  /**
   * logic:mutate: Transform data using set/delete/copy/rename operations
   * Config: { operations: [{ op: 'set'|'delete'|'copy'|'rename', field?, value?, from?, to? }, ...] }
   */
  private async executeLogicMutate(config: any, context: any): Promise<NodeExecutionResult> {
    const { operations = [] } = config;

    // Deep clone currentData
    const mutatedData = JSON.parse(JSON.stringify(context.currentData));

    // Apply each operation
    for (const operation of operations) {
      const { op, field, value, from, to } = operation;

      switch (op) {
        case 'set':
          // Resolve value expression if it's a string with {{...}} syntax
          let resolvedValue: any;
          if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
            const fieldPath = value.slice(2, -2).trim();
            resolvedValue = this.getNestedValue(context.currentData, fieldPath);
          } else {
            resolvedValue = value;
          }
          this.setNestedValue(mutatedData, field, resolvedValue);
          break;

        case 'delete':
          this.deleteNestedValue(mutatedData, field);
          break;

        case 'copy':
          const copyValue = this.getNestedValue(mutatedData, from);
          this.setNestedValue(mutatedData, to, copyValue);
          break;

        case 'rename':
          const renameValue = this.getNestedValue(mutatedData, from);
          this.setNestedValue(mutatedData, to, renameValue);
          this.deleteNestedValue(mutatedData, from);
          break;

        default:
          throw new Error(`Unknown mutation operation: ${op}`);
      }
    }

    return {
      output: mutatedData,
    };
  }

  /**
   * logic:loop: Iterate over array and execute handler node for each item
   * Config: { arrayField: string, loopNodeType: string, loopNodeConfig: any, outputField?: string }
   */
  private async executeLogicLoop(config: any, context: any): Promise<NodeExecutionResult> {
    const { arrayField, loopNodeType, loopNodeConfig = {}, outputField = 'loopResults' } = config;

    // Get array at arrayField from currentData
    const arrayValue = this.getNestedValue(context.currentData, arrayField);

    // Validate it's an array
    if (!Array.isArray(arrayValue)) {
      throw new Error(`Field ${arrayField} is not an array`);
    }

    // Cap at 100 items
    const items = arrayValue.slice(0, 100);
    const results: any[] = [];

    // Execute loop for each item
    for (const item of items) {
      // Create synthetic node
      const syntheticNode: WorkflowNode = {
        id: 'loop-body',
        type: loopNodeType as any,
        position: { x: 0, y: 0 },
        data: {
          config: loopNodeConfig || {},
        },
      };

      // Create scoped context
      const scopedContext = {
        ...context,
        currentData: item,
      };

      // Execute synthetic node
      const result = await this.execute(syntheticNode, scopedContext);
      results.push(result.output);
    }

    return {
      output: {
        ...context.currentData,
        [outputField]: results,
      },
    };
  }

  // ==========================================================================
  // Action: writeDeviceState (ADR-022)
  // ==========================================================================

  /**
   * Write structured key-value output to device_derived_states (ADR-031).
   * Config: { mappings: [{ key: string, expression: string }] }
   * Validates each key against device.attributes before writing.
   * Writes to DeviceDerivedStateService, NOT to DeviceStateService.
   */
  private async executeActionWriteDeviceState(config: any, context: any): Promise<NodeExecutionResult> {
    const { mappings = [], ttlValue = 7, ttlUnit = 'days' } = config;

    // Convert node-level TTL to milliseconds
    const TTL_UNIT_MS: Record<string, number> = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
    const ttlMs = (Number(ttlValue) || 7) * (TTL_UNIT_MS[ttlUnit] ?? TTL_UNIT_MS.days);

    const deviceId = context.trigger?.deviceId ?? context.currentData?.deviceId;
    const stateId = context.trigger?.stateId ?? context.currentData?.stateId;

    if (!deviceId) {
      return {
        output: {
          ...context.currentData,
          writeDeviceStateResult: { skipped: true, reason: 'no deviceId in context' },
        },
        notes: '⚠️ writeDeviceState skipped: deviceId not in context.',
      };
    }

    // Build a flat resolution context so both {{trigger.value}} and {{computed.temp_f}} work
    const resolveCtx = { ...context.currentData, ...context };

    // Load device.attributes for validation
    const ORG_ID = DEFAULT_ORG_ID;
    let deviceAttributes: Record<string, string> = {};
    try {
      const device = await this.deviceService.getByDeviceId(ORG_ID, deviceId);
      deviceAttributes = (device?.attributes as Record<string, string>) ?? {};
    } catch {
      // If device lookup fails, allow write (graceful degradation)
    }

    // Resolve and validate each mapping
    const patch: Record<string, any> = {};
    const rejectedKeys: string[] = [];

    for (const mapping of mappings) {
      const { key, expression } = mapping;
      if (!key) continue;

      // ADR-037: parse {{derived.attr}} or derived.attr syntax → extract attr name
      const derivedMatch =
        key.match(/^\{\{derived\.(\w+)\}\}$/) ?? key.match(/^derived\.(\w+)$/);
      const attrKey = derivedMatch ? derivedMatch[1] : key;

      // Reject keys not in device.attributes (ADR-031)
      if (Object.keys(deviceAttributes).length > 0 && !(attrKey in deviceAttributes)) {
        rejectedKeys.push(attrKey);
        continue;
      }

      const resolved = resolveExpression(expression, resolveCtx);
      const attrType = deviceAttributes[attrKey];
      patch[attrKey] = castValue(resolved, attrType);
    }

    if (rejectedKeys.length > 0) {
      console.warn(`[writeDeviceState] Rejected keys not in device.attributes: ${rejectedKeys.join(', ')}`);
    }

    if (Object.keys(patch).length === 0) {
      return {
        output: { ...context.currentData, writeDeviceStateResult: { patched: false, rejectedKeys } },
        notes: rejectedKeys.length > 0
          ? `⚠️ writeDeviceState: all keys rejected (not in device.attributes): ${rejectedKeys.join(', ')}`
          : 'ℹ️ writeDeviceState: no mappings to write',
      };
    }

    let patched = false;
    let patchError: string | undefined;
    try {
      await deviceDerivedStateService.upsert(deviceId, patch, stateId, ttlMs);
      patched = true;
    } catch (err: any) {
      patchError = err?.message || String(err);
    }

    // ADR-037: timestamp is at trigger root (not stateData sub-key)
    const stateTimestamp =
      context.trigger?.timestamp ??
      context.currentData?.timestamp ??
      new Date();

    return {
      output: {
        ...context.currentData,
        writeDeviceStateResult: {
          patched,
          deviceId,
          keys: Object.keys(patch),
          rejectedKeys,
          ...(patchError ? { error: patchError } : {}),
        },
      },
      ...(patched
        ? {
            broadcastState: {
              deviceId,
              data: {},
              derived: patch,
              timestamp: stateTimestamp,
            },
          }
        : {}),
      ...(patchError
        ? { notes: `⚠️ writeDeviceState failed: ${patchError}` }
        : !patched
          ? { notes: `ℹ️ writeDeviceState: upsert returned no result for deviceId=${deviceId}` }
          : rejectedKeys.length > 0
            ? { notes: `ℹ️ writeDeviceState: wrote ${Object.keys(patch).length} keys; rejected: ${rejectedKeys.join(', ')}` }
            : {}),
    };
  }

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue({ a: { b: 1 } }, 'a.b') => 1
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }

    return value;
  }

  /**
   * Set nested value in object using dot notation
   * Example: setNestedValue({}, 'a.b', 1) => { a: { b: 1 } }
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (current[key] === undefined || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Delete nested value in object using dot notation
   * Example: deleteNestedValue({ a: { b: 1 } }, 'a.b') => { a: {} }
   */
  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (current[key] === null || current[key] === undefined) return;
      current = current[key];
    }

    delete current[lastKey];
  }

  /**
   * Simple expression evaluator
   * Supports: fieldName > value, fieldName < value, etc.
   */
  private evaluateExpression(expression: string, data: any): boolean {
    // Very basic evaluator for MVP
    // Example: "temperature > 80" => true/false

    const match = expression.match(/(\w+)\s*([><=!]+)\s*(.+)/);
    if (!match) return false;

    const field = match[1];
    const operator = match[2];
    const value = JSON.parse(match[3]); // Parse as number/string/etc

    const currentValue = this.getNestedValue(data, field);

    switch (operator) {
      case '>': return currentValue > value;
      case '>=': return currentValue >= value;
      case '<': return currentValue < value;
      case '<=': return currentValue <= value;
      case '==': return currentValue === value;
      case '!=': return currentValue !== value;
      default: return false;
    }
  }

  /**
   * Interpolate variables in string
   * Example: "Temperature is {{temperature}}" => "Temperature is 25"
   */
  private interpolateString(template: string, data: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : '';
    });
  }

  // ==========================================================================
  // Asset Life Management — Stub Handlers (ADR-049, module: asset_life)
  // These are stub implementations. Full integration requires IBM Maximo API
  // credentials and the asset_life engine connection (deferred — GAP-D2 scope).
  // ==========================================================================

  private async executeActionIbmMaximoSync(
    config: Record<string, any>,
    context: any
  ): Promise<NodeExecutionResult> {
    const assetId = resolveExpression(config.assetId ?? '', context) ?? '';
    const workOrderType = config.workOrderType ?? 'PM';
    console.log(`[ibmMaximoSync] STUB — assetId=${assetId}, workOrderType=${workOrderType}`);
    return {
      output: {
        ...context.currentData,
        ibmMaximoSyncResult: {
          queued: true,
          assetId,
          workOrderType,
          message: 'IBM Maximo sync queued (stub — integration pending)',
        },
      },
      notes: `ℹ️ ibmMaximoSync stub executed for assetId=${assetId}`,
    };
  }

  private async executeActionIbmMaximoCreateWorkOrder(
    config: Record<string, any>,
    context: any
  ): Promise<NodeExecutionResult> {
    const assetId = resolveExpression(config.assetId ?? '', context) ?? '';
    const description = resolveExpression(config.description ?? '', context) ?? '';
    const priority = Number(config.priority ?? 2);
    const workOrderType = config.workOrderType ?? 'CM';
    const stubWoNum = `WO-STUB-${Date.now()}`;
    console.log(`[ibmMaximoCreateWorkOrder] STUB — assetId=${assetId}, wo=${stubWoNum}`);
    return {
      output: {
        ...context.currentData,
        ibmMaximoWorkOrder: {
          created: true,
          workOrderNumber: stubWoNum,
          assetId,
          description,
          priority,
          workOrderType,
          note: 'Stub work order — IBM Maximo API integration pending',
        },
      },
      notes: `ℹ️ ibmMaximoCreateWorkOrder stub executed, wo=${stubWoNum}`,
    };
  }

  private async executeDataFleetQuery(
    config: Record<string, any>,
    context: any
  ): Promise<NodeExecutionResult> {
    const outputField = config.outputField ?? 'fleetData';
    const assetType = config.assetType ?? '';
    const metric = config.metric ?? '';
    console.log(`[fleetQuery] STUB — assetType=${assetType}, metric=${metric}`);
    return {
      output: {
        ...context.currentData,
        [outputField]: {
          assetType,
          metric,
          value: 0,
          unit: 'stub',
          timestamp: new Date().toISOString(),
          note: 'Stub data — fleet analytics engine integration pending',
        },
      },
      notes: `ℹ️ fleetQuery stub executed for assetType=${assetType}, metric=${metric}`,
    };
  }

  private async executeDataAssetLifeCalc(
    config: Record<string, any>,
    context: any
  ): Promise<NodeExecutionResult> {
    const outputField = config.outputField ?? 'rul';
    const assetId = resolveExpression(config.assetId ?? '', context) ?? '';
    const model = config.model ?? 'degradation';
    console.log(`[assetLifeCalc] STUB — assetId=${assetId}, model=${model}`);
    return {
      output: {
        ...context.currentData,
        [outputField]: {
          assetId,
          remainingLifeHours: 8760,
          confidence: 0.0,
          model,
          note: 'Stub RUL — asset life engine integration pending',
        },
      },
      notes: `ℹ️ assetLifeCalc stub executed for assetId=${assetId}`,
    };
  }

  // ==========================================================================
  // Combustion DL CSV Playback (module: combustion_dl)
  // ==========================================================================

  /**
   * action:combustionCsvPlayer
   * Replays real combustion lab CSV data through the workflow pipeline.
   * Reads dual-channel sliding windows (p'_CC + q') and derives physics features.
   *
   * Config:
   *   scanNumber: 2 | 3 | 4 | 5   — which CSV file (default: 4)
   *   windowSize: number           — samples per window (default: 3000 = 300ms at 10kHz, per GT2026-179161)
   *   stepSize:   number           — samples to advance per call (default: 1000 = 100ms stride)
   *   storageKey: string           — WorkflowStorage cursor key (default: 'csv_cursor')
   *
   * Outputs: cd_pressure, fft_freqs, fft_amps, anomaly_score, confidence, precursor_class,
   *   normal_prob, lean_blowout_prob, flashback_prob, thermo_acoustic_prob,
   *   spl, hurst_exponent, shannon_entropy, dft_energy, feature_cells,
   *   p_cc_rms, p_cc_std, p_cc_kurtosis, pmt_rms, pmt_std, pmt_kurtosis
   */
  private async executeActionCombustionCsvPlayer(config: any, context: any): Promise<NodeExecutionResult> {
    const {
      loadAndCacheCSV,
      buildCsvPayload,
      parseGenericCsv,
    } = await import('../lib/combustion-csv-utils');

    const filePath: string | undefined = config.filePath;
    const windowSize   = Math.max(100, Math.min(5000, config.windowSize ?? 3000));
    const stepSize     = Math.max(10,  Math.min(1000, config.stepSize   ?? 1000));
    const targetDeviceId: string | undefined = config.deviceId;
    const workflowId   = (context['workflowId'] as string | undefined) ?? '';

    // ── File-upload mode: self-streaming (same pattern as csvStreamPlayer) ──────
    if (filePath) {
      const intervalMs = Math.max(10, Number(config.intervalMs) || 1000);

      let pccSignal: number[];
      let pmtSignal: number[];
      try {
        const csvData = parseGenericCsv(filePath);
        // Auto-detect PCC and PMT columns; config overrides take precedence
        const pccCol = (config.pccColumn as string | undefined)?.trim() || csvData.columns.find(c => c.includes('PD_CC')) || csvData.columns[0];
        const pmtCol = (config.pmtColumn as string | undefined)?.trim() || csvData.columns.find(c => c.includes('PMT'))  || csvData.columns[1] || csvData.columns[0];
        pccSignal = csvData.data.get(pccCol) ?? [];
        pmtSignal = csvData.data.get(pmtCol) ?? [];
        if (pccSignal.length === 0) throw new Error(`Column '${pccCol}' has no data`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { output: { error: `CSV load failed: ${msg}` } };
      }

      // Abort any existing stream for this workflowId before starting a new one.
      // Without this, re-executing accumulates multiple tick loops that can never be stopped.
      if (workflowId) {
        const existing = _streamAbortRegistry.get(workflowId);
        if (existing) existing.abort();
      }
      const abortCtrl = new AbortController();
      if (workflowId) _streamAbortRegistry.set(workflowId, abortCtrl);

      let cursor = 0;
      let lastOutput: Record<string, unknown> = { _status: 'started' };

      const extractWindow = (signal: number[]): number[] => {
        const len = signal.length;
        if (cursor + windowSize <= len) return signal.slice(cursor, cursor + windowSize);
        const tail = signal.slice(cursor);
        return [...tail, ...signal.slice(0, Math.min(windowSize - tail.length, len))];
      };

      return new Promise<NodeExecutionResult>((resolve) => {
        const tick = () => {
          if (abortCtrl.signal.aborted) {
            resolve({ output: { ...lastOutput, _status: 'aborted' } });
            return;
          }

          const pccWindow = extractWindow(pccSignal);
          const pmtWindow = extractWindow(pmtSignal);
          cursor = (cursor + stepSize) % Math.max(pccSignal.length, 1);

          const payload = buildCsvPayload(pccWindow, pmtWindow, 5, cursor);
          const fullPayload = { ...payload, _ts: new Date().toISOString(), _cursor: cursor };
          lastOutput = fullPayload as Record<string, unknown>;

          if (targetDeviceId && this.io) {
            broadcastDeviceState(this.io, {
              deviceId: targetDeviceId,
              data: fullPayload as Record<string, unknown>,
              derived: {},
              timestamp: new Date(),
            });
          }

          const tickExecutor = context['_tickExecutor'] as ((p: Record<string, unknown>) => Promise<void>) | undefined;
          if (tickExecutor) tickExecutor(fullPayload as Record<string, unknown>).catch(() => {});

          setTimeout(tick, intervalMs);
        };

        setTimeout(tick, 0);
      }).then((result) => ({ ...result, skipDownstream: true }));
    }

    // ── Scan-number mode: one-shot per trigger (backward compatible) ──────────
    const { WorkflowStorage } = await import('../models/workflow-storage.model');
    const scanNumber = (config.scanNumber ?? 4) as 2 | 3 | 4 | 5;
    const storageKey = config.storageKey ?? 'csv_cursor';

    let channels: { pcc: number[]; pmt: number[] };
    try {
      channels = loadAndCacheCSV(scanNumber);
    } catch (err: any) {
      return {
        output: { ...context.currentData },
        notes: `⚠️ combustionCsvPlayer: ${err.message}`,
      };
    }

    const { pcc: pccSignal, pmt: pmtSignal } = channels;
    const maxCursor = Math.max(pccSignal.length - windowSize, 0);

    const orgId = DEFAULT_ORG_ID;
    const scopeQuery = { orgId, workflowId: context.workflowId, key: storageKey };
    const stored = await WorkflowStorage.findOne(scopeQuery).lean();
    let cursor: number = (stored?.value as number) ?? 0;
    if (cursor > maxCursor) cursor = 0;

    const extractWindow = (signal: number[]): number[] => {
      const w = signal.slice(cursor, cursor + windowSize);
      if (w.length < windowSize) w.push(...signal.slice(0, windowSize - w.length));
      return w;
    };

    const pccWindow = extractWindow(pccSignal);
    const pmtWindow = extractWindow(pmtSignal);
    const payload = buildCsvPayload(pccWindow, pmtWindow, scanNumber, cursor);

    const nextCursor = (cursor + stepSize) > maxCursor ? 0 : cursor + stepSize;
    await WorkflowStorage.findOneAndUpdate(
      scopeQuery,
      { $set: { value: nextCursor, updatedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();

    return {
      output: { ...context.currentData, ...payload },
      variables: { ...payload },
      notes: `✅ combustionCsvPlayer: scan=${scanNumber} cursor=${cursor}→${nextCursor} window=${windowSize}`,
      ...(targetDeviceId ? {
        broadcastState: {
          deviceId: targetDeviceId,
          data: payload as Record<string, any>,
          derived: {},
          timestamp: new Date(),
        },
      } : {}),
    };
  }

  private async executeCsvStreamPlayer(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<NodeExecutionResult> {
    const filePath = (config['filePath'] as string | undefined) ?? '';
    const windowSize = Math.max(1, Number(config['windowSize']) || 3000);
    const stepSize = Math.max(1, Number(config['stepSize']) || 1000);
    const intervalMs = Math.max(10, Number(config['intervalMs']) || 1000);
    const deviceId = (config['deviceId'] as string | undefined) ?? '';
    const workflowId = (context['workflowId'] as string | undefined) ?? '';

    if (!filePath) {
      return { output: { error: 'filePath not configured' } };
    }

    let csvData: GenericCsvData;
    try {
      csvData = parseGenericCsv(filePath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { output: { error: `CSV load failed: ${msg}` } };
    }

    if (csvData.rowCount === 0) {
      return { output: { error: 'CSV has no data rows' } };
    }

    // Abort any existing stream for this workflowId before starting a new one.
    // Without this, re-executing accumulates multiple tick loops that can never be stopped.
    if (workflowId) {
      const existing = _streamAbortRegistry.get(workflowId);
      if (existing) existing.abort();
    }
    const abortCtrl = new AbortController();
    if (workflowId) _streamAbortRegistry.set(workflowId, abortCtrl);

    let cursor = 0;
    let lastOutput: Record<string, unknown> = { _status: 'started' };

    return new Promise<NodeExecutionResult>((resolve) => {
      const tick = () => {
        if (abortCtrl.signal.aborted) {
          resolve({ output: { ...lastOutput, _status: 'aborted' } });
          return;
        }

        // Extract sliding window for each column with wraparound
        const windows: Record<string, number[]> = {};
        for (const col of csvData.columns) {
          const arr = csvData.data.get(col)!;
          const len = arr.length;
          if (cursor + windowSize <= len) {
            windows[col] = arr.slice(cursor, cursor + windowSize);
          } else {
            // Wrap: take tail + head
            const tail = arr.slice(cursor);
            const need = windowSize - tail.length;
            windows[col] = [...tail, ...arr.slice(0, Math.min(need, len))];
          }
        }

        // Advance cursor with wraparound
        cursor = (cursor + stepSize) % csvData.rowCount;

        // Compute per-column basic statistics
        const payload: Record<string, unknown> = {
          _ts: new Date().toISOString(),
          _cursor: cursor,
        };

        for (const col of csvData.columns) {
          const w = windows[col];
          const n = w.length;
          const mean = w.reduce((a, b) => a + b, 0) / n;
          const rms = Math.sqrt(w.reduce((a, b) => a + b * b, 0) / n);
          const variance = w.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
          const std = Math.sqrt(variance);
          const kurtosis = std > 0
            ? w.reduce((a, b) => a + ((b - mean) / std) ** 4, 0) / n
            : 0;
          payload[col] = w;
          payload[`${col}_rms`] = +rms.toFixed(6);
          payload[`${col}_mean`] = +mean.toFixed(6);
          payload[`${col}_std`] = +std.toFixed(6);
          payload[`${col}_kurtosis`] = +kurtosis.toFixed(6);
        }

        lastOutput = payload;

        // Broadcast directly via Socket.IO (engine's broadcastState path adds too much latency)
        if (deviceId && this.io) {
          broadcastDeviceState(this.io, {
            deviceId,
            data: payload as Record<string, unknown>,
            derived: {},
            timestamp: new Date(),
          });
        }

        // Drive downstream nodes (Write Device State, Debug, etc.) on each tick
        const tickExecutor = context['_tickExecutor'] as ((p: Record<string, unknown>) => Promise<void>) | undefined;
        if (tickExecutor) {
          tickExecutor(payload).catch(() => {});
        }

        setTimeout(tick, intervalMs);
      };

      // Start first tick immediately
      setTimeout(tick, 0);
    }).then((result) => ({ ...result, skipDownstream: true }));
  }

  // ==========================================================================
  // Action: setWorkspace — ephemeral workspace broadcast (no DB write)
  // ==========================================================================

  private async executeSetWorkspace(node: WorkflowNode, context: Record<string, unknown>): Promise<NodeExecutionResult> {
    const config = (node.data as any).config ?? {};
    const mappings: Array<{ from: string; to: string }> = config.mappings ?? [];
    const workflowId = (context['workflowId'] as string | undefined) ?? '';

    // Resolve each mapping expression against the current context
    const fields: Record<string, unknown> = {};
    for (const { from, to } of mappings) {
      if (to) {
        fields[to] = resolveExpression(from, context as any);
      }
    }

    // Broadcast namespaced by nodeId so multiple setWorkspace nodes don't collide
    if (this.io && workflowId) {
      broadcastWorkflowWorkspace(this.io, {
        workflowId,
        workspace: { [node.id]: fields },
      });
    }

    return { output: fields };
  }
}
