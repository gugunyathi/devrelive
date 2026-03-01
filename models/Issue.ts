import mongoose from 'mongoose';

const IssueSchema = new mongoose.Schema(
  {
    // Auto-incremented human-readable ID (ISS-0001, etc.) computed from count
    issueId: { type: String, required: true, unique: true },

    // Ownership
    userId: { type: String, required: true, index: true },
    address: { type: String, required: true, lowercase: true },

    // Content
    topic: { type: String, required: true },
    description: { type: String },

    // Reference to the originating call (optional)
    callId: { type: String, index: true },

    // Status management
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'escalated', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // Assignment
    assignedTo: { type: String }, // DevRel userId
    assignedToName: { type: String },

    // Resolution
    resolution: { type: String },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

IssueSchema.index({ userId: 1, createdAt: -1 });
IssueSchema.index({ status: 1 });
IssueSchema.index({ priority: 1 });

export interface IIssue {
  issueId: string;
  userId: string;
  address: string;
  topic: string;
  description?: string;
  callId?: string;
  status: 'open' | 'in-progress' | 'resolved' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  assignedToName?: string;
  resolution?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Issue || mongoose.model<IIssue>('Issue', IssueSchema);
