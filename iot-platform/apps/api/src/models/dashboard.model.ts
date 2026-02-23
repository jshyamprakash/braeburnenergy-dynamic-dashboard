import mongoose, { Schema, Document } from 'mongoose';

/**
 * Dashboard Block Interface
 */
export interface IDashboardBlock {
  id: string;
  type: 'gauge' | 'chart' | 'liveStream';
  layouts: {
    lg: {
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      maxW?: number;
      minH?: number;
      maxH?: number;
      static?: boolean;
    };
    md: {
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      maxW?: number;
      minH?: number;
      maxH?: number;
      static?: boolean;
    };
    sm: {
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      maxW?: number;
      minH?: number;
      maxH?: number;
      static?: boolean;
    };
  };
  config: Record<string, any>;
}

/**
 * Dashboard Document Interface
 */
export interface IDashboard extends Document {
  userId: string;
  organizationId: string;
  applicationId?: string; // Optional FK to Application (ADR-023)
  dashboardId: string;
  name: string;
  description?: string;
  blocks: IDashboardBlock[];
  layouts: Record<string, any>;
  isShared: boolean;
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dashboard Schema
 */
const DashboardSchema = new Schema<IDashboard>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    applicationId: {
      type: String,
      index: true,
    },
    dashboardId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      default: 'My Dashboard',
    },
    description: {
      type: String,
      default: '',
    },
    blocks: [Schema.Types.Mixed],
    layouts: Schema.Types.Mixed,
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedWith: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'dashboards',
  }
);

// Compound index for unique dashboards per user
DashboardSchema.index({ userId: 1, dashboardId: 1 }, { unique: true });
DashboardSchema.index({ organizationId: 1, dashboardId: 1 });

/**
 * Dashboard Model
 */
export const Dashboard = mongoose.model<IDashboard>('Dashboard', DashboardSchema);
