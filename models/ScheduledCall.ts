import mongoose from 'mongoose';
import crypto from 'crypto';

const ScheduledCallSchema = new mongoose.Schema(
  {
    scheduledCallId: {
      type: String,
      required: true,
      unique: true,
      default: () => `sched_${crypto.randomBytes(8).toString('hex')}`,
    },
    userId: { type: String, required: true, index: true },
    address: { type: String, required: true, lowercase: true },

    title: { type: String, required: true },
    topic: { type: String },
    notes: { type: String },

    // Scheduling
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },

    // Assignments
    devrel: { type: String }, // name or userId of assigned DevRel
    devrelAddress: { type: String, lowercase: true },

    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },

    // Link back to actual call if it happened
    callId: { type: String },
  },
  { timestamps: true }
);

ScheduledCallSchema.index({ userId: 1, scheduledAt: 1 });
ScheduledCallSchema.index({ address: 1 });

export interface IScheduledCall {
  scheduledCallId: string;
  userId: string;
  address: string;
  title: string;
  topic?: string;
  notes?: string;
  scheduledAt: Date;
  durationMinutes: number;
  devrel?: string;
  devrelAddress?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  callId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.ScheduledCall ||
  mongoose.model<IScheduledCall>('ScheduledCall', ScheduledCallSchema);
