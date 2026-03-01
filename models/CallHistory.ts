import mongoose from 'mongoose';
import crypto from 'crypto';

const TranscriptEntrySchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'ai', 'devrel', 'guest'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    speakerAddress: { type: String }, // wallet address of the human speaker, if known
  },
  { _id: false }
);

const ParticipantSchema = new mongoose.Schema(
  {
    address: { type: String, lowercase: true },
    userId: { type: String },
    role: { type: String, enum: ['host', 'devrel', 'guest', 'ai'], default: 'guest' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { _id: false }
);

const CallHistorySchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      default: () => `call_${crypto.randomBytes(8).toString('hex')}`,
    },
    channelName: { type: String, required: true },
    topic: { type: String },

    // Host info
    hostAddress: { type: String, required: true, lowercase: true },
    hostUserId: { type: String },

    // Participants array (rich objects)
    participants: [ParticipantSchema],

    // Call lifecycle
    status: {
      type: String,
      enum: ['active', 'ended', 'escalated'],
      default: 'ended',
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number, default: 0 }, // seconds

    // Content
    transcript: [TranscriptEntrySchema],

    // Resolution
    resolution: { type: String }, // summary of how the issue was resolved
    hasHumanDevRel: { type: Boolean, default: false },
    escalatedTo: { type: String }, // devrel userId if escalated
  },
  { timestamps: true }
);

CallHistorySchema.index({ hostAddress: 1 });
CallHistorySchema.index({ hostUserId: 1 });
CallHistorySchema.index({ callId: 1 });
CallHistorySchema.index({ startTime: -1 });

export interface ICallHistory {
  callId: string;
  channelName: string;
  topic?: string;
  hostAddress: string;
  hostUserId?: string;
  participants: {
    address?: string;
    userId?: string;
    role: string;
    joinedAt: Date;
    leftAt?: Date;
  }[];
  status: 'active' | 'ended' | 'escalated';
  startTime: Date;
  endTime?: Date;
  duration: number;
  transcript: { role: string; text: string; timestamp: Date; speakerAddress?: string }[];
  resolution?: string;
  hasHumanDevRel: boolean;
  escalatedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.CallHistory || mongoose.model<ICallHistory>('CallHistory', CallHistorySchema);
