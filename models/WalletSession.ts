import mongoose from 'mongoose';
import crypto from 'crypto';

const WalletSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      default: () => `sess_${crypto.randomBytes(8).toString('hex')}`,
    },
    userId: { type: String, required: true, index: true },
    address: { type: String, required: true, lowercase: true, index: true },

    // Lifecycle
    signedInAt: { type: Date, default: Date.now },
    signedOutAt: { type: Date },
    isActive: { type: Boolean, default: true },
    duration: { type: Number }, // seconds, set on sign-out

    // Context (optional, from request headers)
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

WalletSessionSchema.index({ sessionId: 1 });
WalletSessionSchema.index({ userId: 1, signedInAt: -1 });
WalletSessionSchema.index({ isActive: 1 });

export interface IWalletSession {
  sessionId: string;
  userId: string;
  address: string;
  signedInAt: Date;
  signedOutAt?: Date;
  isActive: boolean;
  duration?: number;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.WalletSession ||
  mongoose.model<IWalletSession>('WalletSession', WalletSessionSchema);
