import mongoose, { Schema, Document } from 'mongoose';

/**
 * Dashboard Block Interface (legacy react-grid-layout model)
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
 * Kosmos Widget — lightweight content unit placed in a column
 */
export interface IKosmosWidget {
  id: string;
  type: string;
  config: Record<string, any>;
  height: number;
  layout?: { x: number; y: number; w: number; h: number };
}

/**
 * Kosmos Page — a named tab within the dashboard
 */
export interface IKosmosPage {
  pageId: string;
  name: string;
  order: number;
  columns: {
    left: IKosmosWidget[];
    middle: IKosmosWidget[];
    right: IKosmosWidget[];
  };
}

/**
 * Dashboard Document Interface
 *
 * ADR-038: Dashboards are scoped to orgId + applicationId (same as Device/Workflow).
 * ADR-045: User-based sharing — sharedWithUsers replaces shareToken/shareEnabled.
 */
export interface IDashboard extends Document {
  orgId: mongoose.Types.ObjectId;
  applicationId: string;
  dashboardId: string;
  name: string;
  description?: string;
  blocks: IDashboardBlock[];
  layouts: Record<string, any>;
  /** Kosmos multi-page layout */
  pages: IKosmosPage[];
  /** User-based sharing (ADR-045): list of User ObjectIds with viewer access */
  sharedWithUsers: mongoose.Types.ObjectId[];
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
    pages: [Schema.Types.Mixed],
    sharedWithUsers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  {
    timestamps: true,
    collection: 'dashboards',
  }
);

// Unique dashboard per org (matches Device/Workflow pattern)
DashboardSchema.index({ orgId: 1, dashboardId: 1 }, { unique: true });
DashboardSchema.index({ orgId: 1, applicationId: 1 });
// ADR-045: index for viewer dashboard lookup
DashboardSchema.index({ sharedWithUsers: 1 });

/**
 * Dashboard Model
 */
export const Dashboard = mongoose.model<IDashboard>('Dashboard', DashboardSchema);
