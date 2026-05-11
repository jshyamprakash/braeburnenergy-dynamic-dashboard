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
 * Per-user sharing assignment (ADR-045 v2): each user gets their own page visibility list.
 * pageIds: [] means all pages visible; non-empty means only those pages.
 */
export interface IShareAssignment {
  userId: mongoose.Types.ObjectId;
  pageIds: string[];
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
  /** Per-user sharing (ADR-045 v2): each user gets their own page visibility list */
  sharedWithUsers: IShareAssignment[];
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
    sharedWithUsers: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      pageIds: [{ type: String }],
      _id: false,
    }],
  },
  {
    timestamps: true,
    collection: 'dashboards',
  }
);

// Unique dashboard per org (matches Device/Workflow pattern)
DashboardSchema.index({ orgId: 1, dashboardId: 1 }, { unique: true });
DashboardSchema.index({ orgId: 1, applicationId: 1 });
// ADR-045 v2: index for per-user viewer dashboard lookup
DashboardSchema.index({ 'sharedWithUsers.userId': 1 });

/**
 * Dashboard Model
 */
export const Dashboard = mongoose.model<IDashboard>('Dashboard', DashboardSchema);
