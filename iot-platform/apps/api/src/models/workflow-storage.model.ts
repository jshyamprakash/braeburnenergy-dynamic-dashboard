import { Schema, model, Document, Types } from 'mongoose';

/**
 * WorkflowStorage Model
 *
 * Persistent key-value storage for workflows.
 * Supports workflow-scoped and org-scoped entries with optional TTL expiration.
 * Used by logic:storageGet and logic:storageSet nodes.
 */

export interface IWorkflowStorage extends Document {
  // Multi-tenancy
  orgId: Types.ObjectId;

  // Key-value pair
  key: string;              // max 256 characters, unique per (orgId, workflowId, deviceId, key)
  value: any;               // Mixed type for flexibility

  // Scope (optional)
  workflowId?: string;      // If present, scoped to a specific workflow (else org-wide)
  deviceId?: string;        // If present, scoped to a specific device within the workflow

  // TTL
  expiresAt?: Date;         // For time-limited entries (optional)

  // Timestamps
  updatedAt: Date;
}

const workflowStorageSchema = new Schema<IWorkflowStorage>({
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  key: {
    type: String,
    required: true,
    maxlength: 256,
    trim: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  workflowId: {
    type: String,
    index: true,
  },
  deviceId: {
    type: String,
    index: true,
  },
  expiresAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // We manage updatedAt manually
  collection: 'workflow_storage',
});

// Compound unique index: full scope tuple
// Null fields (workflowId, deviceId) are distinct from populated ones — sparse handles missing fields
workflowStorageSchema.index(
  { orgId: 1, workflowId: 1, deviceId: 1, key: 1 },
  { unique: true, sparse: true }
);

// Sparse TTL index: expires documents with expiresAt set
workflowStorageSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, sparse: true }
);

// Additional index for querying all entries for a workflow or device
workflowStorageSchema.index({ orgId: 1, workflowId: 1, deviceId: 1 });

export const WorkflowStorage = model<IWorkflowStorage>('WorkflowStorage', workflowStorageSchema);
