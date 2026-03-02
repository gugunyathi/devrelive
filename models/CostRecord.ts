import mongoose from 'mongoose';

const CostRecordSchema = new mongoose.Schema(
  {
    costId: { type: String, required: true, unique: true },
    // Reference to the forum post or issue driving the cost
    postId: { type: String, index: true },
    issueId: { type: String, index: true },
    title: { type: String, required: true },
    timeToResolve: { type: String },
    callDurationMins: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['open', 'resolved', 'escalated'],
      default: 'open',
    },
    source: {
      type: String,
      enum: ['discord', 'telegram', 'web', 'call'],
      default: 'web',
    },
    // Cost calculation fields
    unitCostPerMinute: { type: Number, default: 2.5 },
    baseTicketCost: { type: Number, default: 10.0 },
    totalCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CostRecordSchema.index({ status: 1 });
CostRecordSchema.index({ source: 1 });
CostRecordSchema.index({ createdAt: -1 });

export interface ICostRecord {
  costId: string;
  postId?: string;
  issueId?: string;
  title: string;
  timeToResolve?: string;
  callDurationMins: number;
  status: 'open' | 'resolved' | 'escalated';
  source: 'discord' | 'telegram' | 'web' | 'call';
  unitCostPerMinute: number;
  baseTicketCost: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.CostRecord || mongoose.model<ICostRecord>('CostRecord', CostRecordSchema);
