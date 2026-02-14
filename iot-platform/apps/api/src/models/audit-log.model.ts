import { Schema, model, Document } from 'mongoose';

/**
 * AuditLog Model
 *
 * EPA-compliant audit trail for all data modifications and user actions.
 * This collection is append-only (no updates or deletes allowed).
 *
 * Compliance: EPA Water Quality Standards, 21 CFR Part 11
 */

export interface IAuditLog extends Document {
  userId?: Schema.Types.ObjectId;
  username: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT';
  resource: string; // e.g., 'Device', 'DeviceState', 'Organization', 'AlarmConfig'
  resourceId?: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    reason?: string; // For critical operations, operator can provide reason
  };
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    required: false,
    ref: 'User',
    index: true,
  },
  username: {
    type: String,
    required: true,
    index: true,
    default: 'anonymous',
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT'],
    index: true,
  },
  resource: {
    type: String,
    required: true,
    index: true,
  },
  resourceId: {
    type: String,
    index: true,
  },
  changes: {
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    reason: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },
  success: {
    type: Boolean,
    required: true,
    default: true,
  },
  errorMessage: String,
}, {
  collection: 'audit_logs',
  timestamps: false, // Using custom timestamp field
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Prevent updates and deletes on audit logs (append-only)
auditLogSchema.pre('updateOne', function(next) {
  next(new Error('Audit logs cannot be updated'));
});

auditLogSchema.pre('updateMany', function(next) {
  next(new Error('Audit logs cannot be updated'));
});

auditLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('Audit logs cannot be updated'));
});

auditLogSchema.pre('deleteOne', function(next) {
  next(new Error('Audit logs cannot be deleted'));
});

auditLogSchema.pre('deleteMany', function(next) {
  next(new Error('Audit logs cannot be deleted'));
});

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
