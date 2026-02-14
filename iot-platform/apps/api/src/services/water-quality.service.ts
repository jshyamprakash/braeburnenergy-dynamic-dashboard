import { WaterQualityParameter, type IWaterQualityParameter } from '../models/water-quality-parameter.model';
import { DeviceState } from '../models';

/**
 * WaterQualityService
 *
 * EPA/AWWA compliant water quality validation and compliance reporting.
 */

export interface WaterQualityValidationResult {
  parameter: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'OPTIMAL' | 'CAUTION' | 'CRITICAL' | 'NON_COMPLIANT';
  isCompliant: boolean;
  violatedStandards: string[];
  correctiveActions?: string[];
  healthRisk?: string;
}

export interface ComplianceReport {
  deviceId: string;
  startDate: Date;
  endDate: Date;
  parameters: {
    parameter: string;
    sampleCount: number;
    compliantSamples: number;
    nonCompliantSamples: number;
    complianceRate: number;
    violations: Array<{
      timestamp: Date;
      value: number;
      standard: string;
      description: string;
    }>;
  }[];
  overallComplianceRate: number;
  totalViolations: number;
  generatedAt: Date;
}

export class WaterQualityService {
  /**
   * Create water quality parameter
   */
  async createParameter(data: Partial<IWaterQualityParameter>): Promise<IWaterQualityParameter> {
    const parameter = new WaterQualityParameter(data);
    await parameter.save();
    return parameter;
  }

  /**
   * Get parameter by code
   */
  async getParameterByCode(code: string): Promise<IWaterQualityParameter | null> {
    return WaterQualityParameter.findOne({ code: code.toUpperCase(), isActive: true });
  }

  /**
   * List all active parameters
   */
  async listParameters(filter: {
    category?: string;
    isRegulated?: boolean;
  } = {}): Promise<IWaterQualityParameter[]> {
    const query: any = { isActive: true };
    if (filter.category) query.category = filter.category;
    if (filter.isRegulated !== undefined) query.isRegulated = filter.isRegulated;

    return WaterQualityParameter.find(query).sort({ category: 1, name: 1 });
  }

  /**
   * Update parameter
   */
  async updateParameter(
    code: string,
    updates: Partial<IWaterQualityParameter>
  ): Promise<IWaterQualityParameter | null> {
    return WaterQualityParameter.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete parameter
   */
  async deleteParameter(code: string): Promise<boolean> {
    const result = await WaterQualityParameter.deleteOne({ code: code.toUpperCase() });
    return result.deletedCount > 0;
  }

  /**
   * Validate water quality reading
   */
  async validateReading(
    parameterCode: string,
    value: number,
    timestamp: Date = new Date()
  ): Promise<WaterQualityValidationResult> {
    const parameter = await this.getParameterByCode(parameterCode);

    if (!parameter) {
      throw new Error(`Water quality parameter "${parameterCode}" not found`);
    }

    // Determine status
    let status: 'OPTIMAL' | 'CAUTION' | 'CRITICAL' | 'NON_COMPLIANT';

    if (parameter.isOptimal(value)) {
      status = 'OPTIMAL';
    } else if (parameter.isCaution && parameter.isCaution(value)) {
      status = 'CAUTION';
    } else if (parameter.isCritical && parameter.isCritical(value)) {
      status = 'CRITICAL';
    } else {
      status = 'NON_COMPLIANT';
    }

    // Check compliance
    const complianceStatus = parameter.getComplianceStatus(value);

    return {
      parameter: parameter.name,
      value,
      unit: parameter.unit,
      timestamp,
      status,
      isCompliant: complianceStatus.isCompliant,
      violatedStandards: complianceStatus.violatedStandards,
      correctiveActions: status !== 'OPTIMAL' ? parameter.correctiveActions : undefined,
      healthRisk: status === 'CRITICAL' || status === 'NON_COMPLIANT' ? parameter.healthRisk : undefined,
    };
  }

  /**
   * Validate multiple readings
   */
  async validateReadings(
    readings: Array<{ parameterCode: string; value: number; timestamp?: Date }>
  ): Promise<WaterQualityValidationResult[]> {
    const results: WaterQualityValidationResult[] = [];

    for (const reading of readings) {
      try {
        const result = await this.validateReading(
          reading.parameterCode,
          reading.value,
          reading.timestamp
        );
        results.push(result);
      } catch (error: any) {
        console.error(`Validation failed for ${reading.parameterCode}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Generate compliance report for device
   */
  async generateComplianceReport(
    deviceId: string,
    startDate: Date,
    endDate: Date,
    parameterCodes?: string[]
  ): Promise<ComplianceReport> {
    // Fetch device states in date range
    const states = await DeviceState.find({
      'metadata.deviceId': deviceId,
      timestamp: { $gte: startDate, $lte: endDate },
    }).sort({ timestamp: 1 });

    // Get relevant parameters
    const query: any = { isActive: true, isRegulated: true };
    if (parameterCodes && parameterCodes.length > 0) {
      query.code = { $in: parameterCodes.map(c => c.toUpperCase()) };
    }
    const parameters = await WaterQualityParameter.find(query);

    // Analyze each parameter
    const parameterResults: ComplianceReport['parameters'] = [];

    for (const parameter of parameters) {
      const violations: ComplianceReport['parameters'][0]['violations'] = [];
      let compliantSamples = 0;
      let nonCompliantSamples = 0;
      let sampleCount = 0;

      for (const state of states) {
        // Check if this state has data for this parameter
        const fieldName = parameter.code.toLowerCase();
        const value = (state.data as any)[fieldName];

        if (value === undefined || value === null) continue;

        sampleCount++;
        const complianceStatus = parameter.getComplianceStatus(value);

        if (complianceStatus.isCompliant) {
          compliantSamples++;
        } else {
          nonCompliantSamples++;

          // Record violations
          for (const standard of complianceStatus.violatedStandards) {
            violations.push({
              timestamp: state.timestamp,
              value,
              standard: standard.split(' (')[0], // Extract standard name
              description: standard,
            });
          }
        }
      }

      parameterResults.push({
        parameter: parameter.name,
        sampleCount,
        compliantSamples,
        nonCompliantSamples,
        complianceRate: sampleCount > 0 ? (compliantSamples / sampleCount) * 100 : 0,
        violations,
      });
    }

    // Calculate overall compliance
    const totalSamples = parameterResults.reduce((sum, p) => sum + p.sampleCount, 0);
    const totalCompliant = parameterResults.reduce((sum, p) => sum + p.compliantSamples, 0);
    const totalViolations = parameterResults.reduce((sum, p) => sum + p.violations.length, 0);

    return {
      deviceId,
      startDate,
      endDate,
      parameters: parameterResults,
      overallComplianceRate: totalSamples > 0 ? (totalCompliant / totalSamples) * 100 : 0,
      totalViolations,
      generatedAt: new Date(),
    };
  }

  /**
   * Get sampling requirements for device
   */
  async getSamplingRequirements(parameterCodes?: string[]): Promise<Array<{
    parameter: string;
    code: string;
    requirements: IWaterQualityParameter['samplingRequirements'];
  }>> {
    const query: any = { isActive: true, isRegulated: true };
    if (parameterCodes && parameterCodes.length > 0) {
      query.code = { $in: parameterCodes.map(c => c.toUpperCase()) };
    }

    const parameters = await WaterQualityParameter.find(query);

    return parameters
      .filter(p => p.samplingRequirements && p.samplingRequirements.length > 0)
      .map(p => ({
        parameter: p.name,
        code: p.code,
        requirements: p.samplingRequirements,
      }));
  }

  /**
   * Seed default EPA/AWWA water quality parameters
   */
  async seedDefaultParameters(): Promise<void> {
    const defaultParameters: Partial<IWaterQualityParameter>[] = [
      // ========================================================================
      // CHEMICAL PARAMETERS
      // ========================================================================
      {
        name: 'pH',
        code: 'PH',
        category: 'CHEMICAL',
        description: 'Measure of water acidity or alkalinity',
        unit: 'pH',
        complianceLimits: [
          {
            standard: 'EPA_SMCL',
            description: 'Secondary Maximum Contaminant Level',
            minValue: 6.5,
            maxValue: 8.5,
            unit: 'pH',
            citation: '40 CFR 143.3',
          },
          {
            standard: 'AWWA',
            description: 'AWWA Operational Range',
            minValue: 6.5,
            maxValue: 8.5,
            targetValue: 7.0,
            unit: 'pH',
          },
        ],
        optimalRange: { min: 7.0, max: 8.0, description: 'Ideal drinking water pH' },
        cautionRange: { min: 6.5, max: 8.5, description: 'Acceptable but may cause corrosion or scaling' },
        criticalRange: { min: 6.0, max: 9.0, description: 'May damage distribution system' },
        samplingRequirements: [
          {
            frequency: 'daily',
            sampleCount: 1,
            method: 'EPA 150.1',
            holdingTime: 0.25, // 15 minutes
          },
        ],
        healthRisk: 'Extreme pH can cause corrosion of pipes, releasing metals into water',
        correctiveActions: [
          'Adjust chemical feed (lime for low pH, CO2 for high pH)',
          'Check corrosion control treatment',
          'Verify chemical feed equipment calibration',
        ],
        isRegulated: true,
        requiresContinuousMonitoring: true,
        tags: ['drinking-water', 'corrosion-control'],
      },
      {
        name: 'Chlorine Residual (Free)',
        code: 'CL2_FREE',
        category: 'DISINFECTION',
        description: 'Free chlorine remaining after disinfection',
        unit: 'mg/L',
        alternateUnits: ['ppm'],
        complianceLimits: [
          {
            standard: 'EPA_MCL',
            description: 'Maximum Residual Disinfectant Level',
            maxValue: 4.0,
            unit: 'mg/L',
            citation: '40 CFR 141.65',
          },
          {
            standard: 'AWWA',
            description: 'Distribution System Minimum',
            minValue: 0.2,
            unit: 'mg/L',
          },
        ],
        optimalRange: { min: 0.5, max: 2.0, description: 'Effective disinfection without taste issues' },
        cautionRange: { min: 0.2, max: 4.0, description: 'Minimum for disinfection, maximum for taste' },
        criticalRange: { min: 0.0, max: 0.2, description: 'Insufficient disinfection' },
        samplingRequirements: [
          {
            frequency: 'daily',
            sampleCount: 1,
            location: 'Entry point and distribution system',
            method: 'EPA 330.5',
            holdingTime: 0.25,
          },
        ],
        healthRisk: 'Low chlorine increases risk of waterborne pathogens; high chlorine causes taste/odor issues',
        correctiveActions: [
          'Adjust chlorine feed rate',
          'Check chlorinator equipment',
          'Increase contact time in clearwell',
          'Inspect for leaks or cross-connections',
        ],
        detectionLimit: 0.02,
        reportingLimit: 0.1,
        measurementPrecision: 5,
        isRegulated: true,
        requiresContinuousMonitoring: true,
        tags: ['disinfection', 'drinking-water'],
      },
      {
        name: 'Turbidity',
        code: 'TURB',
        category: 'PHYSICAL',
        description: 'Cloudiness or haziness of water',
        unit: 'NTU',
        complianceLimits: [
          {
            standard: 'EPA_TT',
            description: 'Treatment Technique for Filtered Water',
            maxValue: 0.3,
            actionLevel: 1.0,
            unit: 'NTU',
            citation: '40 CFR 141.173',
          },
        ],
        optimalRange: { min: 0.0, max: 0.1, description: 'Clear water with minimal interference' },
        cautionRange: { min: 0.1, max: 0.3, description: 'Acceptable but monitor filtration' },
        criticalRange: { min: 0.3, max: 1.0, description: 'May shield pathogens from disinfection' },
        samplingRequirements: [
          {
            frequency: 'every 4 hours',
            sampleCount: 6,
            location: 'Filter effluent',
            method: 'EPA 180.1',
            holdingTime: 48,
          },
        ],
        healthRisk: 'High turbidity can harbor pathogens and reduce disinfection effectiveness',
        correctiveActions: [
          'Backwash filters',
          'Adjust coagulant dose',
          'Inspect filter media for breakthrough',
          'Check raw water source for turbidity spikes',
        ],
        detectionLimit: 0.01,
        reportingLimit: 0.05,
        measurementPrecision: 2,
        isRegulated: true,
        requiresContinuousMonitoring: true,
        tags: ['filtration', 'drinking-water'],
      },
      {
        name: 'Total Dissolved Solids',
        code: 'TDS',
        category: 'PHYSICAL',
        description: 'Total dissolved inorganic and organic substances',
        unit: 'mg/L',
        alternateUnits: ['ppm'],
        complianceLimits: [
          {
            standard: 'EPA_SMCL',
            description: 'Secondary Maximum Contaminant Level',
            maxValue: 500,
            unit: 'mg/L',
            citation: '40 CFR 143.3',
          },
        ],
        optimalRange: { min: 50, max: 300, description: 'Good taste, low corrosivity' },
        cautionRange: { min: 300, max: 500, description: 'Acceptable taste' },
        criticalRange: { min: 500, max: 1000, description: 'Poor taste, scaling issues' },
        samplingRequirements: [
          {
            frequency: 'weekly',
            sampleCount: 1,
            method: 'EPA 160.1',
            holdingTime: 168,
          },
        ],
        correctiveActions: [
          'Implement reverse osmosis or ion exchange',
          'Check water source for contamination',
          'Blend with lower TDS source',
        ],
        isRegulated: true,
        requiresContinuousMonitoring: false,
        tags: ['drinking-water', 'taste'],
      },
      {
        name: 'Lead',
        code: 'PB',
        category: 'CHEMICAL',
        description: 'Lead concentration (from corrosion of pipes)',
        unit: 'µg/L',
        alternateUnits: ['ppb'],
        complianceLimits: [
          {
            standard: 'EPA_MCL',
            description: 'Action Level',
            actionLevel: 15,
            unit: 'µg/L',
            citation: '40 CFR 141.80',
          },
          {
            standard: 'EPA_MCLG',
            description: 'Maximum Contaminant Level Goal',
            maxValue: 0,
            unit: 'µg/L',
          },
        ],
        optimalRange: { min: 0, max: 5, description: 'Minimal health risk' },
        cautionRange: { min: 5, max: 15, description: 'Monitor and improve corrosion control' },
        criticalRange: { min: 15, max: 50, description: 'Exceedance of action level' },
        samplingRequirements: [
          {
            frequency: 'semi-annually or annually',
            sampleCount: 10,
            location: 'High-risk homes (lead service lines)',
            method: 'EPA 200.8',
            holdingTime: 168,
          },
        ],
        healthRisk: 'Neurological damage, especially in children; kidney and blood pressure problems in adults',
        symptomDescription: 'Developmental delays in children, fatigue, abdominal pain',
        correctiveActions: [
          'Implement corrosion control treatment',
          'Replace lead service lines',
          'Public education on flushing and filters',
          'Optimize pH and alkalinity',
        ],
        detectionLimit: 1,
        reportingLimit: 5,
        isRegulated: true,
        requiresContinuousMonitoring: false,
        tags: ['drinking-water', 'heavy-metal', 'health-risk'],
      },
    ];

    for (const paramData of defaultParameters) {
      const existing = await WaterQualityParameter.findOne({ code: paramData.code });
      if (!existing) {
        await this.createParameter(paramData);
        console.log(`✅ Seeded water quality parameter: ${paramData.name}`);
      }
    }

    console.log(`✅ Water quality parameter seeding complete`);
  }
}
