import { ValidationRule, DeviceState, type IValidationRule, type QualityStatus, type IQualityMetadata } from '../models';

/**
 * DataQualityService
 *
 * EPA/AWWA-compliant data quality assurance and validation.
 * Implements automated quality checks and manual quality review.
 */

export interface ValidationResult {
  isValid: boolean;
  quality: IQualityMetadata;
  errors: string[];
  warnings: string[];
}

export class DataQualityService {
  /**
   * Validate device state data against all applicable rules
   */
  async validateDeviceState(
    deviceId: string,
    data: Record<string, any>,
    timestamp: Date = new Date()
  ): Promise<ValidationResult> {
    // Get all active validation rules for this device and global rules
    const rules = await ValidationRule.find({
      $or: [
        { deviceId, isActive: true },
        { deviceId: null, isActive: true },
      ],
    });

    const flags: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 100;

    // Apply each validation rule
    for (const rule of rules) {
      const fieldValue = data[rule.field];

      // Skip if field doesn't exist in data
      if (fieldValue === undefined || fieldValue === null) {
        continue;
      }

      const ruleResult = await this.applyValidationRule(
        rule,
        fieldValue,
        deviceId,
        data,
        timestamp
      );

      if (!ruleResult.passed) {
        flags.push(rule.qualityFlag);

        // Reduce quality score based on severity
        const scoreReduction = {
          INFO: 5,
          WARNING: 15,
          ERROR: 30,
          CRITICAL: 50,
        }[rule.severity];

        qualityScore = Math.max(0, qualityScore - scoreReduction);

        // Categorize message
        if (rule.severity === 'ERROR' || rule.severity === 'CRITICAL') {
          errors.push(ruleResult.message);
        } else {
          warnings.push(ruleResult.message);
        }
      }
    }

    // Determine overall quality status
    let status: QualityStatus;
    if (qualityScore >= 80) {
      status = 'GOOD';
    } else if (qualityScore >= 50) {
      status = 'QUESTIONABLE';
    } else {
      status = 'BAD';
    }

    // If any CRITICAL errors, mark as BAD
    if (errors.some(e => e.includes('CRITICAL'))) {
      status = 'BAD';
    }

    return {
      isValid: errors.length === 0,
      quality: {
        status,
        flags: [...new Set(flags)], // Remove duplicates
        score: qualityScore,
        validatedAt: new Date(),
        validatedBy: 'system',
      },
      errors,
      warnings,
    };
  }

  /**
   * Apply a single validation rule
   */
  private async applyValidationRule(
    rule: IValidationRule,
    value: any,
    deviceId: string,
    _data: Record<string, any>,
    timestamp: Date
  ): Promise<{ passed: boolean; message: string }> {
    switch (rule.validationType) {
      case 'RANGE':
        return this.validateRange(rule, value);

      case 'RATE_OF_CHANGE':
        return await this.validateRateOfChange(rule, value, deviceId, timestamp);

      case 'STUCK_VALUE':
        return await this.validateStuckValue(rule, value, deviceId, timestamp);

      case 'SPIKE_DETECTION':
        return await this.validateSpikeDetection(rule, value, deviceId, timestamp);

      default:
        return { passed: true, message: '' };
    }
  }

  /**
   * Validate value is within acceptable range
   */
  private validateRange(rule: IValidationRule, value: number): { passed: boolean; message: string } {
    const { min, max } = rule.parameters;

    if (min !== undefined && value < min) {
      return {
        passed: false,
        message: `${rule.field} value ${value} below minimum ${min} (${rule.severity})`,
      };
    }

    if (max !== undefined && value > max) {
      return {
        passed: false,
        message: `${rule.field} value ${value} above maximum ${max} (${rule.severity})`,
      };
    }

    return { passed: true, message: '' };
  }

  /**
   * Validate rate of change between readings
   */
  private async validateRateOfChange(
    rule: IValidationRule,
    currentValue: number,
    deviceId: string,
    currentTimestamp: Date
  ): Promise<{ passed: boolean; message: string }> {
    const { maxChange, timeWindow = 300 } = rule.parameters; // Default 5 minutes

    if (maxChange === undefined) {
      return { passed: true, message: '' };
    }

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

    if (!previousReading || !previousReading.data[rule.field]) {
      return { passed: true, message: '' }; // No previous data to compare
    }

    const previousValue = previousReading.data[rule.field];
    const change = Math.abs(currentValue - previousValue);

    if (change > maxChange) {
      return {
        passed: false,
        message: `${rule.field} change of ${change.toFixed(2)} exceeds maximum ${maxChange} (${rule.severity})`,
      };
    }

    return { passed: true, message: '' };
  }

  /**
   * Detect stuck/unchanging sensor values
   */
  private async validateStuckValue(
    rule: IValidationRule,
    currentValue: number,
    deviceId: string,
    currentTimestamp: Date
  ): Promise<{ passed: boolean; message: string }> {
    const { tolerance = 0.01, timeWindow = 3600 } = rule.parameters; // Default 1 hour

    // Get recent readings
    const recentReadings = await DeviceState.find({
      'metadata.deviceId': deviceId,
      timestamp: {
        $gte: new Date(currentTimestamp.getTime() - timeWindow * 1000),
        $lt: currentTimestamp,
      },
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    if (recentReadings.length < 5) {
      return { passed: true, message: '' }; // Not enough data
    }

    // Check if all values are within tolerance
    const allSame = recentReadings.every((reading) => {
      const value = reading.data[rule.field];
      return value !== undefined && Math.abs(value - currentValue) <= tolerance;
    });

    if (allSame) {
      return {
        passed: false,
        message: `${rule.field} stuck at ${currentValue} (${rule.severity})`,
      };
    }

    return { passed: true, message: '' };
  }

  /**
   * Detect sudden spikes or drops in values
   */
  private async validateSpikeDetection(
    rule: IValidationRule,
    currentValue: number,
    deviceId: string,
    currentTimestamp: Date
  ): Promise<{ passed: boolean; message: string }> {
    const { threshold } = rule.parameters;

    if (threshold === undefined) {
      return { passed: true, message: '' };
    }

    // Get recent readings to calculate baseline
    const recentReadings = await DeviceState.find({
      'metadata.deviceId': deviceId,
      timestamp: {
        $gte: new Date(currentTimestamp.getTime() - 3600 * 1000), // Last hour
        $lt: currentTimestamp,
      },
    })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    if (recentReadings.length < 5) {
      return { passed: true, message: '' }; // Not enough data
    }

    // Calculate mean and standard deviation
    const values = recentReadings
      .map((r) => r.data[rule.field])
      .filter((v) => v !== undefined && v !== null);

    if (values.length === 0) {
      return { passed: true, message: '' };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Check if current value deviates by more than threshold standard deviations
    const deviation = Math.abs(currentValue - mean) / (stdDev || 1);

    if (deviation > threshold) {
      return {
        passed: false,
        message: `${rule.field} spike detected: ${currentValue} deviates ${deviation.toFixed(1)}σ from mean ${mean.toFixed(2)} (${rule.severity})`,
      };
    }

    return { passed: true, message: '' };
  }

  /**
   * Manually override quality status
   */
  async manualQualityReview(
    stateId: string,
    status: QualityStatus,
    comment: string,
    userId: string
  ): Promise<boolean> {
    const result = await DeviceState.updateOne(
      { _id: stateId },
      {
        $set: {
          'quality.status': status,
          'quality.validatedAt': new Date(),
          'quality.validatedBy': userId,
          'quality.comment': comment,
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Get quality statistics for a device
   */
  async getQualityStats(deviceId: string, days: number = 7): Promise<{
    total: number;
    byStatus: Record<QualityStatus, number>;
    averageScore: number;
    commonFlags: Array<{ flag: string; count: number }>;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const states = await DeviceState.find({
      'metadata.deviceId': deviceId,
      timestamp: { $gte: startDate },
    }).lean();

    const byStatus: Record<QualityStatus, number> = {
      GOOD: 0,
      BAD: 0,
      QUESTIONABLE: 0,
      ESTIMATED: 0,
    };

    const flagCounts: Record<string, number> = {};
    let totalScore = 0;
    let scoreCount = 0;

    states.forEach((state) => {
      const status = state.quality?.status || 'GOOD';
      byStatus[status]++;

      if (state.quality?.score !== undefined) {
        totalScore += state.quality.score;
        scoreCount++;
      }

      state.quality?.flags?.forEach((flag) => {
        flagCounts[flag] = (flagCounts[flag] || 0) + 1;
      });
    });

    const commonFlags = Object.entries(flagCounts)
      .map(([flag, count]) => ({ flag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: states.length,
      byStatus,
      averageScore: scoreCount > 0 ? totalScore / scoreCount : 100,
      commonFlags,
    };
  }

  /**
   * Seed default validation rules (for initial setup)
   */
  async seedDefaultRules(): Promise<void> {
    const defaults: Partial<IValidationRule>[] = [
      // Water Quality Parameters (EPA/AWWA Standards)
      {
        name: 'pH Range Check',
        description: 'pH must be between 6.5 and 8.5 for drinking water (EPA)',
        field: 'pH',
        validationType: 'RANGE',
        parameters: { min: 6.5, max: 8.5 },
        severity: 'ERROR',
        qualityFlag: 'PH_OUT_OF_RANGE',
        failureAction: 'FLAG',
        standard: 'EPA SDWA',
        instrument: 'pH meter',
        isActive: true,
      },
      {
        name: 'Temperature Range Check',
        description: 'Water temperature monitoring range',
        field: 'temperature',
        validationType: 'RANGE',
        parameters: { min: 0, max: 40 },
        severity: 'WARNING',
        qualityFlag: 'TEMP_OUT_OF_RANGE',
        failureAction: 'FLAG',
        standard: 'AWWA',
        isActive: true,
      },
      {
        name: 'Dissolved Oxygen Range',
        description: 'DO must be between 0 and 20 mg/L',
        field: 'dissolvedOxygen',
        validationType: 'RANGE',
        parameters: { min: 0, max: 20 },
        severity: 'ERROR',
        qualityFlag: 'DO_OUT_OF_RANGE',
        failureAction: 'FLAG',
        standard: 'EPA Method 360.1',
        instrument: 'DO sensor',
        isActive: true,
      },
      {
        name: 'Turbidity Range',
        description: 'Turbidity must be between 0 and 1000 NTU',
        field: 'turbidity',
        validationType: 'RANGE',
        parameters: { min: 0, max: 1000 },
        severity: 'WARNING',
        qualityFlag: 'TURBIDITY_OUT_OF_RANGE',
        failureAction: 'FLAG',
        standard: 'EPA Method 180.1',
        instrument: 'Turbidimeter',
        isActive: true,
      },
      // Rate of Change Checks
      {
        name: 'pH Rapid Change Detection',
        description: 'pH should not change more than 0.5 units per 5 minutes',
        field: 'pH',
        validationType: 'RATE_OF_CHANGE',
        parameters: { maxChange: 0.5, timeWindow: 300 },
        severity: 'WARNING',
        qualityFlag: 'PH_RAPID_CHANGE',
        failureAction: 'FLAG',
        isActive: true,
      },
      {
        name: 'Temperature Rapid Change',
        description: 'Temperature should not change more than 5°C per 10 minutes',
        field: 'temperature',
        validationType: 'RATE_OF_CHANGE',
        parameters: { maxChange: 5, timeWindow: 600 },
        severity: 'WARNING',
        qualityFlag: 'TEMP_RAPID_CHANGE',
        failureAction: 'FLAG',
        isActive: true,
      },
      // Spike Detection
      {
        name: 'pH Spike Detection',
        description: 'Detect sudden pH spikes (>3 standard deviations)',
        field: 'pH',
        validationType: 'SPIKE_DETECTION',
        parameters: { threshold: 3 },
        severity: 'ERROR',
        qualityFlag: 'PH_SPIKE',
        failureAction: 'FLAG',
        isActive: true,
      },
      // Stuck Value Detection
      {
        name: 'Temperature Sensor Stuck',
        description: 'Detect stuck temperature sensor (unchanged for 1 hour)',
        field: 'temperature',
        validationType: 'STUCK_VALUE',
        parameters: { tolerance: 0.1, timeWindow: 3600 },
        severity: 'ERROR',
        qualityFlag: 'SENSOR_STUCK',
        failureAction: 'FLAG',
        isActive: true,
      },
    ];

    for (const defaultRule of defaults) {
      const existing = await ValidationRule.findOne({
        name: defaultRule.name,
        field: defaultRule.field,
      });

      if (!existing) {
        await ValidationRule.create(defaultRule);
        console.log(`✅ Created default validation rule: ${defaultRule.name}`);
      }
    }
  }
}
