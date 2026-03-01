import mongoose from 'mongoose';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema(
  {
    // Stable human-readable ID — never changes even if wallet changes
    userId: {
      type: String,
      required: true,
      unique: true,
      default: () => `usr_${crypto.randomBytes(8).toString('hex')}`,
    },
    address: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Profile
    username: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
    avatarUrl: { type: String },
    email: { type: String, trim: true, lowercase: true },

    // Role
    isAdmin: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },

    // Activity timestamps
    lastSeenAt: { type: Date, default: Date.now },
    joinedAt: { type: Date, default: Date.now },

    // Aggregate stats — incremented by API routes, not recalculated each time
    stats: {
      totalCalls: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      totalDuration: { type: Number, default: 0 }, // seconds
    },

    // User preferences
    preferences: {
      notifications: { type: Boolean, default: true },
      theme: { type: String, default: 'dark' },
    },
  },
  { timestamps: true }
);

// Indexes for common query patterns
UserSchema.index({ userId: 1 });
UserSchema.index({ address: 1 });

export interface IUser {
  userId: string;
  address: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  isAdmin: boolean;
  isBanned: boolean;
  lastSeenAt: Date;
  joinedAt: Date;
  stats: { totalCalls: number; totalMessages: number; totalDuration: number };
  preferences: { notifications: boolean; theme: string };
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
