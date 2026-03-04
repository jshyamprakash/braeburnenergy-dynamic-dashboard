import vm from 'vm';
import { WorkflowNode } from '../models/workflow.model';
import { ModbusGateway } from '../models/modbus-gateway.model';
import { ModbusClientService } from './modbus-client.service';
import { DeviceService } from './device.service';
import { deviceStateService } from './device-state.service';
import { deviceDerivedStateService } from './device-derived-state.service';
import { modbusGatewayManager } from './modbus-gateway-manager.service';
import { DEFAULT_ORG_ID } from '../lib/request-context';

/**
 * Node execution result
 */
export interface NodeExecutionResult {
  output?: any;                    // Output data to pass to next node
  conditionMet?: boolean;          // For condition nodes (true/false branch)
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
  // Non-strings pass through as-is
  if (typeof value !== 'string') return value;

  // Replace all {{...}} expressions
  return value.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
    // Resolve dot-notation path (e.g., "trigger.temperature" → context.trigger.temperature)
    const parts = path.trim().split('.');
    let resolved: any = context;

    for (const part of parts) {
      if (resolved == null) return _match; // Return original if path breaks
      resolved = resolved[part];
    }

    // Convert to string if resolved, else return original match
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
  // No explicit type: preserve the native JS type (number stays number, etc.)
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

  constructor() {
    this.deviceService = new DeviceService();
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

      // Logic (ADR-017)
      case 'logic:function':
        return this.executeLogicFunction(config, context);

      // Action: write structured data back to DeviceState (ADR-022)
      case 'action:writeDeviceState':
        return this.executeActionWriteDeviceState(config, context);

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
    const { message, channels } = config;

    // Interpolate variables in message
    const interpolatedMessage = this.interpolateString(message, context.currentData);

    // Send notification (integrate with notification service)
    console.log(`[NOTIFICATION] Channels: ${channels.join(', ')}, Message: ${interpolatedMessage}`);

    // TODO: Integrate with actual notification service
    // - Email: nodemailer
    // - SMS: Twilio
    // - WebSocket: Socket.io broadcast
    // - Webhook: HTTP POST

    return {
      output: {
        ...context.currentData,
        notificationSent: true,
        notificationMessage: interpolatedMessage,
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
    const { mappings = [] } = config;

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
      await deviceDerivedStateService.upsert(deviceId, patch, stateId);
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
}
