import mongoose from 'mongoose';

/**
 * DevRelStats — persists leaderboard metrics for both human and AI agent devrels.
 *
 * type: 'human' | 'agent'
 * Scoring weights:
 *   overallScore = issuesResolved * 10 + commentsEngaged * 2 + liveCalls * 5 + githubPushes * 8
 *   devrelTokensEarned mirrors the same formula but tracked separately so it can be
 *     adjusted independently (airdrops, bonuses, etc.).
 */
const DevRelStatsSchema = new mongoose.Schema(
  {
    // Stable identifier — wallet address for humans, agent ID string for agents
    devrelId: { type: String, required: true, unique: true },

    // Display info
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    description: { type: String, maxlength: 200 },

    // Whether this entry is a human or an AI agent
    type: { type: String, enum: ['human', 'agent'], required: true, default: 'human' },

    // Agent-specific metadata
    agentFramework: { type: String }, // e.g. "Gemini Live", "GPT-4o", "Claude"
    agentCapabilities: [{ type: String }], // e.g. ["code-repair", "debug", "docs"]

    // Core leaderboard metrics
    issuesResolved: { type: Number, default: 0 },
    commentsEngaged: { type: Number, default: 0 },
    liveCalls: { type: Number, default: 0 },
    githubPushes: { type: Number, default: 0 },

    // Derived / cached score — recomputed on each stat update
    overallScore: { type: Number, default: 0 },

    // DevRel token balance earned through platform activity
    devrelTokensEarned: { type: Number, default: 0 },

    // Soft-delete / visibility
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Score helper — kept in sync with the client-side scoring in LeaderboardView
DevRelStatsSchema.methods.recomputeScore = function () {
  this.overallScore =
    this.issuesResolved * 10 +
    this.commentsEngaged * 2 +
    this.liveCalls * 5 +
    this.githubPushes * 8;
  this.devrelTokensEarned = Math.floor(this.overallScore * 0.5);
};

DevRelStatsSchema.index({ type: 1, overallScore: -1 });
DevRelStatsSchema.index({ devrelId: 1 });

export interface IDevRelStats {
  devrelId: string;
  displayName: string;
  avatarUrl?: string;
  description?: string;
  type: 'human' | 'agent';
  agentFramework?: string;
  agentCapabilities?: string[];
  issuesResolved: number;
  commentsEngaged: number;
  liveCalls: number;
  githubPushes: number;
  overallScore: number;
  devrelTokensEarned: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.DevRelStats ||
  mongoose.model<IDevRelStats>('DevRelStats', DevRelStatsSchema);
