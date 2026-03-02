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
 *
 * ADR-038: Dashboards are scoped to orgId + applicationId (same as Device/Workflow).
 * userId ownership removed — dashboards are application-level shared resources.
 */
export interface IDashboard extends Document {
  orgId: mongoose.Types.ObjectId;
  applicationId: string;
  dashboardId: string;
  name: string;
  description?: string;
  blocks: IDashboardBlock[];
  layouts: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dashboard Schema
 */
const DashboardSchema = new Schema<IDashboard>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    applicationId: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
    collection: 'dashboards',
  }
);

// Unique dashboard per org (matches Device/Workflow pattern)
DashboardSchema.index({ orgId: 1, dashboardId: 1 }, { unique: true });
DashboardSchema.index({ orgId: 1, applicationId: 1 });

/**
 * Dashboard Model
 */
export const Dashboard = mongoose.model<IDashboard>('Dashboard', DashboardSchema);
