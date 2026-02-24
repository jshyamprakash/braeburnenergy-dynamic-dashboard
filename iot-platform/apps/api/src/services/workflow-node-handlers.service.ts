import vm from 'vm';
import { WorkflowNode } from '../models/workflow.model';
import { ModbusGateway } from '../models/modbus-gateway.model';
import { ModbusClientService } from './modbus-client.service';
import { DeviceService } from './device.service';
import { deviceStateService } from './device-state.service';
import { modbusGatewayManager } from './modbus-gateway-manager.service';

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
  return String(value); // default: string
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

  private async executeTrigger(config: any, context: any): Promise<NodeExecutionResult> {
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
    const { startHour, endHour, timezone } = config;

    const now = new Date();
    const currentHour = now.getHours(); // TODO: Handle timezone

    const conditionMet = currentHour >= startHour && currentHour <= endHour;

    return {
      output: context.currentData,
      conditionMet,
    };
  }

  private async executeConditionDeviceStatus(config: any, context: any): Promise<NodeExecutionResult> {
    const { deviceId, status } = config;

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
    const { message, channels, recipients } = config;

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
    // For MVP, using DEFAULT_ORG_ID
    const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

    try {
      await this.deviceService.update(DEFAULT_ORG_ID, deviceId, {
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
    const { deviceId, field, priority, message } = config;

    // Create alarm instance (integrate with alarm service)
    console.log(`[ALARM] Device: ${deviceId}, Field: ${field}, Priority: ${priority}, Message: ${message}`);

    // TODO: Integrate with AlarmService to create AlarmInstance

    return {
      output: {
        ...context.currentData,
        alarmCreated: true,
        alarmPriority: priority,
      },
    };
  }

  private async executeActionCallWebhook(config: any, context: any): Promise<NodeExecutionResult> {
    const { url, method, headers, body } = config;

    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body || context.currentData),
      });

      const responseData = await response.json();

      return {
        output: {
          ...context.currentData,
          webhookResponse: responseData,
          webhookStatus: response.status,
        },
      };
    } catch (error: any) {
      throw new Error(`Webhook call failed: ${error.message}`);
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

    const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

    const result = await deviceStateService.getStates(DEFAULT_ORG_ID, deviceId, {
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

    const sandbox = {
      data: { ...context.currentData },
      result: {} as Record<string, any>,
    };

    vm.runInNewContext(code, sandbox, { timeout: 3000 });

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
   * Write structured key-value output back to the originating DeviceState document.
   * Config: { mappings: [{ key: string, expression: string }] }
   * Context must contain trigger.stateId and trigger.deviceId
   */
  private async executeActionWriteDeviceState(config: any, context: any): Promise<NodeExecutionResult> {
    const { mappings = [] } = config;

    const stateId = context.trigger?.stateId ?? context.currentData?.stateId;
    const deviceId = context.trigger?.deviceId ?? context.currentData?.deviceId;

    if (!stateId || !deviceId) {
      // Manual test-run: no stateId available — skip the write, emit a visible warning note.
      // Auto-triggered runs (device sends data) always have stateId from the dispatcher.
      return {
        output: {
          ...context.currentData,
          writeDeviceStateResult: { skipped: true, reason: 'no stateId/deviceId in context (manual test run)' },
        },
        notes: '⚠️ writeDeviceState skipped: stateId not in context. For live writes, trigger via auto (device sends data). For manual testing, include stateId in test input.',
      };
    }

    // Build a flat resolution context so both {{trigger.value}} and {{computed.temp_f}} work:
    //   context.currentData holds node outputs (e.g. computed, value, stateId)
    //   context.trigger / context.variables are top-level keys
    // Spread currentData first so explicit top-level keys win on collision.
    const resolveCtx = { ...context.currentData, ...context };

    // Resolve each mapping expression
    const patch: Record<string, any> = {};
    for (const mapping of mappings) {
      const { key, expression } = mapping;
      if (!key) continue;
      const resolved = resolveExpression(expression, resolveCtx);
      // Cast value using device attributes schema if available
      const attrType = context.deviceAttributes?.[key];
      patch[key] = castValue(resolved, attrType);
    }

    if (Object.keys(patch).length === 0) {
      return { output: context.currentData };
    }

    const stateTimestamp =
      context.trigger?.stateData?.timestamp ??
      context.currentData?.stateData?.timestamp;
    const orgId =
      context.trigger?.stateData?.orgId ??
      context.currentData?.stateData?.orgId ??
      'aaaaaaaaaaaaaaaaaaaaaaaa';

    let patched = false;
    let patchError: string | undefined;
    try {
      patched = await deviceStateService.upsertDerived(deviceId, stateId, stateTimestamp ?? new Date(), orgId, patch);
    } catch (err: any) {
      patchError = err?.message || String(err);
    }

    return {
      output: {
        ...context.currentData,
        writeDeviceStateResult: {
          patched,
          stateId,
          keys: Object.keys(patch),
          ...(patchError ? { error: patchError } : {}),
        },
      },
      // On success, signal the engine to broadcast a device:state WebSocket update
      // so dashboards see derived values in real-time.
      ...(patched && stateTimestamp
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
        ? { notes: `⚠️ upsertDerived failed: ${patchError}` }
        : !patched
          ? { notes: `ℹ️ upsertDerived: no document created for stateId=${stateId}` }
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
