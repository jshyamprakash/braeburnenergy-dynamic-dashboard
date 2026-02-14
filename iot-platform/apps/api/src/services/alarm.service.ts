import { AlarmRule, AlarmInstance, DeviceState, type IAlarmRule, type IAlarmInstance, type AlarmState } from '../models';

/**
 * AlarmService
 *
 * ISA-18.2 compliant alarm management service.
 * Handles alarm evaluation, state transitions, and acknowledgment.
 */

export interface AlarmEvaluationResult {
  triggered: boolean;
  value: number | string;
  message: string;
}

export class AlarmService {
  /**
   * Evaluate device state against all active alarm rules
   * Called during device state ingestion
   */
  async evaluateDeviceState(
    deviceId: string,
    deviceTags: string[],
    data: Record<string, any>,
    stateId: string,
    timestamp: Date = new Date()
  ): Promise<IAlarmInstance[]> {
    // Get all active alarm rules for this device
    const rules = await AlarmRule.find({
      $or: [
        { deviceId, isActive: true, isEnabled: true, isShelved: false },
        { deviceId: null, deviceTags: { $in: deviceTags }, isActive: true, isEnabled: true, isShelved: false },
        { deviceId: null, deviceTags: { $size: 0 }, isActive: true, isEnabled: true, isShelved: false }, // Global rules
      ],
    });

    const triggeredAlarms: IAlarmInstance[] = [];

    for (const rule of rules) {
      const fieldValue = data[rule.field];

      // Skip if field doesn't exist in data
      if (fieldValue === undefined || fieldValue === null) {
        continue;
      }

      // Evaluate alarm condition
      const evaluation = await this.evaluateCondition(rule, fieldValue, deviceId, timestamp);

      if (evaluation.triggered) {
        // Check if alarm already exists and is active
        const existingAlarm = await AlarmInstance.findOne({
          alarmRuleId: rule._id,
          deviceId,
          state: { $in: ['ACTIVE_UNACKED', 'ACTIVE_ACKED'] },
        });

        if (!existingAlarm) {
          // Create new alarm instance
          const alarm = await AlarmInstance.create({
            alarmRuleId: rule._id,
            tagName: rule.tagName,
            deviceId,
            field: rule.field,
            triggerValue: evaluation.value,
            triggerTimestamp: timestamp,
            triggerStateId: stateId,
            state: 'ACTIVE_UNACKED',
            priority: rule.priority,
            requiresAcknowledgment: rule.requiresAcknowledgment,
            activeTimestamp: timestamp,
            stateTransitions: [
              {
                fromState: null,
                toState: 'ACTIVE_UNACKED',
                timestamp,
              },
            ],
          });

          triggeredAlarms.push(alarm);
        }
      } else {
        // Condition cleared - check if we need to clear existing alarm
        const existingAlarm = await AlarmInstance.findOne({
          alarmRuleId: rule._id,
          deviceId,
          state: { $in: ['ACTIVE_UNACKED', 'ACTIVE_ACKED'] },
        });

        if (existingAlarm) {
          // Auto-clear alarm
          await this.clearAlarm(existingAlarm._id.toString(), timestamp);
        }
      }
    }

    return triggeredAlarms;
  }

  /**
   * Evaluate alarm condition
   */
  private async evaluateCondition(
    rule: IAlarmRule,
    value: any,
    deviceId: string,
    timestamp: Date
  ): Promise<AlarmEvaluationResult> {
    const { conditionType, operator, parameters } = rule;

    switch (conditionType) {
      case 'THRESHOLD':
        return this.evaluateThreshold(value, operator, parameters);

      case 'RANGE':
        return this.evaluateRange(value, operator, parameters);

      case 'DEVIATION':
        return this.evaluateDeviation(value, parameters);

      case 'RATE_OF_CHANGE':
        return await this.evaluateRateOfChange(value, deviceId, rule.field, timestamp, parameters);

      case 'QUALITY':
        return this.evaluateQuality(value, parameters);

      default:
        return { triggered: false, value, message: 'Unknown condition type' };
    }
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(
    value: number,
    operator: string,
    parameters: any
  ): AlarmEvaluationResult {
    const { threshold } = parameters;
    // Note: deadband parameter available but not currently used in simple threshold comparison

    let triggered = false;
    let message = '';

    switch (operator) {
      case 'GREATER_THAN':
        triggered = value > threshold;
        message = triggered ? `Value ${value} exceeds threshold ${threshold}` : '';
        break;

      case 'GREATER_EQUAL':
        triggered = value >= threshold;
        message = triggered ? `Value ${value} >= threshold ${threshold}` : '';
        break;

      case 'LESS_THAN':
        triggered = value < threshold;
        message = triggered ? `Value ${value} below threshold ${threshold}` : '';
        break;

      case 'LESS_EQUAL':
        triggered = value <= threshold;
        message = triggered ? `Value ${value} <= threshold ${threshold}` : '';
        break;

      case 'EQUAL':
        triggered = value === threshold;
        message = triggered ? `Value ${value} equals threshold ${threshold}` : '';
        break;

      case 'NOT_EQUAL':
        triggered = value !== threshold;
        message = triggered ? `Value ${value} not equal to threshold ${threshold}` : '';
        break;
    }

    return { triggered, value, message };
  }

  /**
   * Evaluate range condition
   */
  private evaluateRange(
    value: number,
    operator: string,
    parameters: any
  ): AlarmEvaluationResult {
    const { min, max } = parameters;

    let triggered = false;
    let message = '';

    if (operator === 'BETWEEN') {
      triggered = value >= min && value <= max;
      message = triggered ? `Value ${value} within range [${min}, ${max}]` : '';
    } else if (operator === 'OUTSIDE') {
      triggered = value < min || value > max;
      message = triggered ? `Value ${value} outside range [${min}, ${max}]` : '';
    }

    return { triggered, value, message };
  }

  /**
   * Evaluate deviation from setpoint
   */
  private evaluateDeviation(
    value: number,
    parameters: any
  ): AlarmEvaluationResult {
    const { setpoint, max: maxDeviation } = parameters;

    const deviation = Math.abs(value - setpoint);
    const triggered = deviation > maxDeviation;
    const message = triggered
      ? `Deviation ${deviation.toFixed(2)} exceeds max ${maxDeviation} from setpoint ${setpoint}`
      : '';

    return { triggered, value, message };
  }

  /**
   * Evaluate rate of change
   */
  private async evaluateRateOfChange(
    currentValue: number,
    deviceId: string,
    field: string,
    currentTimestamp: Date,
    parameters: any
  ): Promise<AlarmEvaluationResult> {
    const { maxChange, timeWindow = 300 } = parameters; // Default 5 minutes

    // Get previous reading within time window
    const previousReading = await DeviceState.findOne({
      'metadata.deviceId': deviceId,
      timestamp: {
        $gte: new Date(currentTimestamp.getTime() - timeWindow * 1000),
        $lt: currentTimestamp,
      },
    })
      .sort({ timestamp: -1 })
      .lean();

    if (!previousReading || !previousReading.data[field]) {
      return { triggered: false, value: currentValue, message: 'No previous data to compare' };
    }

    const previousValue = previousReading.data[field];
    const change = Math.abs(currentValue - previousValue);
    const triggered = change > maxChange;
    const message = triggered
      ? `Rate of change ${change.toFixed(2)} exceeds maximum ${maxChange}`
      : '';

    return { triggered, value: currentValue, message };
  }

  /**
   * Evaluate quality-based condition
   */
  private evaluateQuality(
    value: any,
    parameters: any
  ): AlarmEvaluationResult {
    const { qualityStatus } = parameters;

    // Assuming value is a quality status string
    const triggered = value === qualityStatus;
    const message = triggered ? `Quality status is ${value}` : '';

    return { triggered, value, message };
  }

  /**
   * Acknowledge alarm (operator response)
   */
  async acknowledgeAlarm(
    alarmId: string,
    userId: string,
    comment?: string
  ): Promise<IAlarmInstance | null> {
    const alarm = await AlarmInstance.findById(alarmId);

    if (!alarm) {
      return null;
    }

    // Validate state transition
    if (alarm.state !== 'ACTIVE_UNACKED' && alarm.state !== 'CLEARED_UNACKED') {
      throw new Error(`Cannot acknowledge alarm in state ${alarm.state}`);
    }

    // Determine new state
    const newState: AlarmState = alarm.state === 'ACTIVE_UNACKED' ? 'ACTIVE_ACKED' : 'CLEARED_ACKED';

    // Update alarm
    alarm.state = newState;
    alarm.acknowledgedBy = userId;
    alarm.acknowledgedTimestamp = new Date();
    alarm.acknowledgmentComment = comment;

    // Add state transition
    alarm.stateTransitions.push({
      fromState: alarm.state === 'ACTIVE_ACKED' ? 'ACTIVE_UNACKED' : 'CLEARED_UNACKED',
      toState: newState,
      timestamp: new Date(),
      userId,
      comment,
    });

    // If cleared and acknowledged, set resolved timestamp
    if (newState === 'CLEARED_ACKED') {
      alarm.resolvedTimestamp = new Date();
    }

    await alarm.save();

    return alarm;
  }

  /**
   * Clear alarm (condition no longer active)
   */
  async clearAlarm(
    alarmId: string,
    timestamp: Date = new Date(),
    userId?: string
  ): Promise<IAlarmInstance | null> {
    const alarm = await AlarmInstance.findById(alarmId);

    if (!alarm) {
      return null;
    }

    // Validate state transition
    if (alarm.state !== 'ACTIVE_UNACKED' && alarm.state !== 'ACTIVE_ACKED') {
      throw new Error(`Cannot clear alarm in state ${alarm.state}`);
    }

    const currentState = alarm.state;
    const newState: AlarmState = alarm.state === 'ACTIVE_UNACKED' ? 'CLEARED_UNACKED' : 'CLEARED_ACKED';

    // Update alarm
    alarm.state = newState;
    alarm.clearedTimestamp = timestamp;

    // Add state transition
    alarm.stateTransitions.push({
      fromState: currentState,
      toState: newState,
      timestamp,
      userId,
    });

    // If alarm doesn't require acknowledgment, resolve immediately
    if (!alarm.requiresAcknowledgment && newState === 'CLEARED_UNACKED') {
      alarm.state = 'CLEARED_ACKED';
      alarm.resolvedTimestamp = timestamp;

      alarm.stateTransitions.push({
        fromState: 'CLEARED_UNACKED',
        toState: 'CLEARED_ACKED',
        timestamp,
        comment: 'Auto-acknowledged (no ack required)',
      });
    }

    await alarm.save();

    return alarm;
  }

  /**
   * Shelve alarm (temporarily suppress)
   */
  async shelveAlarm(
    alarmId: string,
    userId: string,
    reason: string,
    duration?: number // Duration in seconds
  ): Promise<IAlarmInstance | null> {
    const alarm = await AlarmInstance.findById(alarmId);

    if (!alarm) {
      return null;
    }

    alarm.isShelved = true;
    alarm.shelvedTimestamp = new Date();
    alarm.shelvedBy = userId;
    alarm.shelvedReason = reason;

    if (duration) {
      alarm.shelvedUntil = new Date(Date.now() + duration * 1000);
    }

    const currentState = alarm.state;
    alarm.state = 'SHELVED';

    alarm.stateTransitions.push({
      fromState: currentState,
      toState: 'SHELVED',
      timestamp: new Date(),
      userId,
      comment: reason,
    });

    await alarm.save();

    return alarm;
  }

  /**
   * Unshelve alarm
   */
  async unshelveAlarm(
    alarmId: string,
    userId: string
  ): Promise<IAlarmInstance | null> {
    const alarm = await AlarmInstance.findById(alarmId);

    if (!alarm || alarm.state !== 'SHELVED') {
      return null;
    }

    alarm.isShelved = false;
    alarm.shelvedUntil = undefined;

    // Restore previous state (assume ACTIVE_UNACKED if not acknowledged)
    const newState: AlarmState = alarm.acknowledgedTimestamp ? 'ACTIVE_ACKED' : 'ACTIVE_UNACKED';
    alarm.state = newState;

    alarm.stateTransitions.push({
      fromState: 'SHELVED',
      toState: newState,
      timestamp: new Date(),
      userId,
      comment: 'Unshelved',
    });

    await alarm.save();

    return alarm;
  }

  /**
   * Get active alarms for device
   */
  async getActiveAlarms(deviceId: string): Promise<IAlarmInstance[]> {
    return AlarmInstance.find({
      deviceId,
      state: { $in: ['ACTIVE_UNACKED', 'ACTIVE_ACKED'] },
    })
      .sort({ priority: 1, activeTimestamp: -1 }) // Sort by priority (CRITICAL first)
      .lean() as unknown as IAlarmInstance[];
  }

  /**
   * Get alarm statistics
   */
  async getAlarmStatistics(
    deviceId?: string,
    days: number = 7
  ): Promise<{
    total: number;
    byState: Record<AlarmState, number>;
    byPriority: Record<string, number>;
    averageResponseTime: number;
    activeCount: number;
    unresolvedCount: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filter: any = {
      activeTimestamp: { $gte: startDate },
    };

    if (deviceId) {
      filter.deviceId = deviceId;
    }

    const alarms = await AlarmInstance.find(filter).lean();

    const byState: Record<AlarmState, number> = {
      ACTIVE_UNACKED: 0,
      ACTIVE_ACKED: 0,
      CLEARED_UNACKED: 0,
      CLEARED_ACKED: 0,
      SHELVED: 0,
    };

    const byPriority: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    alarms.forEach((alarm) => {
      byState[alarm.state]++;
      byPriority[alarm.priority]++;

      if (alarm.responseTime) {
        totalResponseTime += alarm.responseTime;
        responseTimeCount++;
      }
    });

    const activeCount = byState.ACTIVE_UNACKED + byState.ACTIVE_ACKED;
    const unresolvedCount = activeCount + byState.CLEARED_UNACKED;

    return {
      total: alarms.length,
      byState,
      byPriority,
      averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
      activeCount,
      unresolvedCount,
    };
  }

  /**
   * Seed default alarm rules (for initial setup)
   */
  async seedDefaultRules(): Promise<void> {
    const defaults: Partial<IAlarmRule>[] = [
      // Critical temperature alarm (high-high)
      {
        name: 'Temperature High-High',
        description: 'Critical temperature threshold - immediate action required',
        tagName: 'TT-HH',
        field: 'temperature',
        conditionType: 'THRESHOLD',
        operator: 'GREATER_THAN',
        parameters: {
          threshold: 35,
          deadband: 1,
        },
        priority: 'CRITICAL',
        requiresAcknowledgment: true,
        notificationChannels: ['websocket', 'email'],
        rationalization: 'Temperature exceeding 35°C poses risk to equipment and water quality',
        consequence: 'Equipment damage, microbial growth risk',
        correctiveAction: 'Activate cooling system, investigate heat source',
        isaClass: 'ALARM',
        isActive: true,
        isEnabled: true,
        isShelved: false,
      },
      // High temperature alarm
      {
        name: 'Temperature High',
        description: 'High temperature warning - monitor closely',
        tagName: 'TT-H',
        field: 'temperature',
        conditionType: 'THRESHOLD',
        operator: 'GREATER_THAN',
        parameters: {
          threshold: 30,
          deadband: 1,
        },
        priority: 'HIGH',
        requiresAcknowledgment: true,
        notificationChannels: ['websocket'],
        rationalization: 'Temperature approaching critical limits',
        consequence: 'Potential equipment issues if temperature continues rising',
        correctiveAction: 'Monitor temperature trend, prepare cooling system',
        isaClass: 'ALARM',
        isActive: true,
        isEnabled: true,
        isShelved: false,
      },
      // Low pH alarm
      {
        name: 'pH Low',
        description: 'pH below acceptable range',
        tagName: 'PH-L',
        field: 'pH',
        conditionType: 'THRESHOLD',
        operator: 'LESS_THAN',
        parameters: {
          threshold: 6.5,
          deadband: 0.2,
        },
        priority: 'HIGH',
        requiresAcknowledgment: true,
        notificationChannels: ['websocket'],
        rationalization: 'pH below EPA SDWA minimum (6.5)',
        consequence: 'Corrosion risk, non-compliant water quality',
        correctiveAction: 'Add pH adjustment chemicals, investigate cause',
        isaClass: 'ALARM',
        isActive: true,
        isEnabled: true,
        isShelved: false,
      },
      // High pH alarm
      {
        name: 'pH High',
        description: 'pH above acceptable range',
        tagName: 'PH-H',
        field: 'pH',
        conditionType: 'THRESHOLD',
        operator: 'GREATER_THAN',
        parameters: {
          threshold: 8.5,
          deadband: 0.2,
        },
        priority: 'HIGH',
        requiresAcknowledgment: true,
        notificationChannels: ['websocket'],
        rationalization: 'pH above EPA SDWA maximum (8.5)',
        consequence: 'Scaling risk, non-compliant water quality',
        correctiveAction: 'Add pH adjustment chemicals, investigate cause',
        isaClass: 'ALARM',
        isActive: true,
        isEnabled: true,
        isShelved: false,
      },
      // Quality alarm
      {
        name: 'Data Quality Bad',
        description: 'Data quality status is BAD',
        tagName: 'DQ-BAD',
        field: 'quality.status',
        conditionType: 'QUALITY',
        operator: 'EQUAL',
        parameters: {
          qualityStatus: 'BAD',
        },
        priority: 'MEDIUM',
        requiresAcknowledgment: true,
        notificationChannels: ['websocket'],
        rationalization: 'Data quality failure indicates sensor or validation issues',
        consequence: 'Unreliable data, potential compliance issues',
        correctiveAction: 'Investigate sensor calibration, check validation rules',
        isaClass: 'ADVISORY',
        isActive: true,
        isEnabled: true,
        isShelved: false,
      },
    ];

    for (const defaultRule of defaults) {
      const existing = await AlarmRule.findOne({
        tagName: defaultRule.tagName,
        field: defaultRule.field,
      });

      if (!existing) {
        await AlarmRule.create(defaultRule);
        console.log(`✅ Created default alarm rule: ${defaultRule.name}`);
      }
    }
  }
}
