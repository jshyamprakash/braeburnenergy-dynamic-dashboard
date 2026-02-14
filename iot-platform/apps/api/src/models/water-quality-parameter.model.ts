import { Schema, model, Document } from 'mongoose';

/**
 * WaterQualityParameter Model
 *
 * EPA/AWWA compliant water quality parameter definitions.
 * Provides regulatory limits, acceptable ranges, and validation rules.
 */

export type ParameterCategory =
  | 'PHYSICAL'           // Temperature, turbidity, color
  | 'CHEMICAL'           // pH, chlorine, fluoride, metals
  | 'MICROBIOLOGICAL'    // Bacteria, coliforms, pathogens
  | 'RADIOLOGICAL'       // Radium, uranium
  | 'DISINFECTION';      // Chlorine residual, chloramine

export type RegulatoryStandard =
  | 'EPA_MCL'            // Maximum Contaminant Level
  | 'EPA_MCLG'           // Maximum Contaminant Level Goal
  | 'EPA_SMCL'           // Secondary Maximum Contaminant Level
  | 'EPA_TT'             // Treatment Technique requirement
  | 'AWWA'               // American Water Works Association
  | 'WHO'                // World Health Organization
  | 'CUSTOM';            // Site-specific limits

export interface IComplianceLimit {
  standard: RegulatoryStandard;
  description: string;
  minValue?: number;               // Minimum acceptable value
  maxValue?: number;               // Maximum acceptable value
  targetValue?: number;            // Optimal target value
  actionLevel?: number;            // Triggers corrective action
  unit: string;
  citation?: string;               // Regulatory reference (e.g., "40 CFR 141.63")
}

export interface ISamplingRequirement {
  frequency: string;               // e.g., "daily", "weekly", "monthly"
  sampleCount: number;             // Number of samples per period
  location?: string;               // Sampling location requirement
  method?: string;                 // EPA-approved method (e.g., "EPA 180.1")
  holdingTime?: number;            // Max time before analysis (hours)
}

export interface IWaterQualityParameter extends Document {
  // Identification
  name: string;                    // e.g., "pH", "Chlorine Residual", "Turbidity"
  code: string;                    // Short code (e.g., "PH", "CL2", "TURB")
  category: ParameterCategory;
  description?: string;

  // Measurement units
  unit: string;                    // e.g., "pH", "mg/L", "NTU"
  alternateUnits?: string[];       // e.g., ["ppm", "ppb"]

  // Compliance limits
  complianceLimits: IComplianceLimit[];

  // Operating ranges
  optimalRange: {
    min: number;
    max: number;
    description?: string;
  };
  cautionRange?: {
    min: number;
    max: number;
    description?: string;
  };
  criticalRange?: {
    min: number;
    max: number;
    description?: string;
  };

  // Sampling requirements
  samplingRequirements?: ISamplingRequirement[];

  // Health and safety
  healthRisk?: string;             // Description of health risks
  symptomDescription?: string;     // Symptoms of exposure
  correctiveActions?: string[];    // Recommended actions when out of range

  // Technical details
  detectionLimit?: number;         // Minimum detectable concentration
  reportingLimit?: number;         // Minimum reportable concentration
  measurementPrecision?: number;   // Expected precision (±%)
  interferencingSubstances?: string[]; // Substances that affect measurement

  // Status
  isActive: boolean;
  isRegulated: boolean;            // Subject to regulatory reporting
  requiresContinuousMonitoring: boolean;

  // Metadata
  tags?: string[];
  references?: string[];           // Links to regulations, standards
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isOptimal(value: number): boolean;
  isCaution(value: number): boolean;
  isCritical(value: number): boolean;
  getComplianceStatus(value: number): {
    isCompliant: boolean;
    violatedStandards: string[];
  };
}

const complianceLimitSchema = new Schema({
  standard: {
    type: String,
    required: true,
    enum: ['EPA_MCL', 'EPA_MCLG', 'EPA_SMCL', 'EPA_TT', 'AWWA', 'WHO', 'CUSTOM'],
  },
  description: {
    type: String,
    required: true,
    maxlength: 200,
  },
  minValue: {
    type: Number,
  },
  maxValue: {
    type: Number,
  },
  targetValue: {
    type: Number,
  },
  actionLevel: {
    type: Number,
  },
  unit: {
    type: String,
    required: true,
    maxlength: 20,
  },
  citation: {
    type: String,
    maxlength: 100,
  },
}, { _id: false });

const samplingRequirementSchema = new Schema({
  frequency: {
    type: String,
    required: true,
    maxlength: 50,
  },
  sampleCount: {
    type: Number,
    required: true,
    min: 1,
  },
  location: {
    type: String,
    maxlength: 100,
  },
  method: {
    type: String,
    maxlength: 50,
  },
  holdingTime: {
    type: Number,
    min: 0,
  },
}, { _id: false });

const waterQualityParameterSchema = new Schema<IWaterQualityParameter>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 20,
    unique: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['PHYSICAL', 'CHEMICAL', 'MICROBIOLOGICAL', 'RADIOLOGICAL', 'DISINFECTION'],
    index: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  unit: {
    type: String,
    required: true,
    maxlength: 20,
  },
  alternateUnits: {
    type: [String],
    default: [],
  },
  complianceLimits: {
    type: [complianceLimitSchema],
    required: true,
    validate: {
      validator: function(limits: IComplianceLimit[]) {
        return limits.length > 0;
      },
      message: 'At least one compliance limit is required',
    },
  },
  optimalRange: {
    type: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
      description: {
        type: String,
        maxlength: 200,
      },
    },
    required: true,
  },
  cautionRange: {
    type: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
      description: {
        type: String,
        maxlength: 200,
      },
    },
  },
  criticalRange: {
    type: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
      description: {
        type: String,
        maxlength: 200,
      },
    },
  },
  samplingRequirements: {
    type: [samplingRequirementSchema],
    default: [],
  },
  healthRisk: {
    type: String,
    maxlength: 500,
  },
  symptomDescription: {
    type: String,
    maxlength: 500,
  },
  correctiveActions: {
    type: [String],
    default: [],
  },
  detectionLimit: {
    type: Number,
    min: 0,
  },
  reportingLimit: {
    type: Number,
    min: 0,
  },
  measurementPrecision: {
    type: Number,
    min: 0,
    max: 100,
  },
  interferencingSubstances: {
    type: [String],
    default: [],
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
  isRegulated: {
    type: Boolean,
    required: true,
    default: true,
  },
  requiresContinuousMonitoring: {
    type: Boolean,
    required: true,
    default: false,
  },
  tags: {
    type: [String],
    default: [],
    index: true,
  },
  references: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
  collection: 'water_quality_parameters',
});

// Compound indexes
waterQualityParameterSchema.index({ category: 1, isActive: 1 });
waterQualityParameterSchema.index({ isRegulated: 1, isActive: 1 });

// Virtual: Check if value is within optimal range
waterQualityParameterSchema.methods.isOptimal = function(value: number): boolean {
  return value >= this.optimalRange.min && value <= this.optimalRange.max;
};

// Virtual: Check if value is within caution range
waterQualityParameterSchema.methods.isCaution = function(value: number): boolean {
  if (!this.cautionRange) return false;
  return value >= this.cautionRange.min && value <= this.cautionRange.max;
};

// Virtual: Check if value is critical
waterQualityParameterSchema.methods.isCritical = function(value: number): boolean {
  if (!this.criticalRange) return false;
  return value >= this.criticalRange.min && value <= this.criticalRange.max;
};

// Virtual: Get compliance status
waterQualityParameterSchema.methods.getComplianceStatus = function(value: number): {
  isCompliant: boolean;
  violatedStandards: string[];
} {
  const violatedStandards: string[] = [];

  for (const limit of this.complianceLimits) {
    let violated = false;

    if (limit.minValue !== undefined && value < limit.minValue) {
      violated = true;
    }
    if (limit.maxValue !== undefined && value > limit.maxValue) {
      violated = true;
    }

    if (violated) {
      violatedStandards.push(`${limit.standard} (${limit.description})`);
    }
  }

  return {
    isCompliant: violatedStandards.length === 0,
    violatedStandards,
  };
};

export const WaterQualityParameter = model<IWaterQualityParameter>('WaterQualityParameter', waterQualityParameterSchema);
