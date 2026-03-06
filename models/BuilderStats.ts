import mongoose from 'mongoose';

/**
 * BuilderStats — leaderboard metrics for community users (builders/devs using the platform).
 *
 * Scoring:
 *   builderScore = issuesRaised * 3 + repairsResolved * 15 + ratingsGiven * 2 + floor(satisfactionRating * 20)
 *   builderRewardsEarned = floor(builderScore * 0.3)
 */
const BuilderStatsSchema = new mongoose.Schema(
  {
    // Wallet address as stable ID
    userId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    address: { type: String, lowercase: true, trim: true },

    // Community ranking metrics
    issuesRaised: { type: Number, default: 0 },       // how many issues they've filed
    repairsResolved: { type: Number, default: 0 },    // how many of their issues got resolved
    ratingsGiven: { type: Number, default: 0 },       // how many sessions they've rated
    satisfactionRating: { type: Number, default: 0 }, // avg score 0.0–5.0 of ratings they received

    // Derived / cached
    builderScore: { type: Number, default: 0 },
    builderRewardsEarned: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BuilderStatsSchema.methods.recomputeScore = function () {
  this.builderScore =
    this.issuesRaised * 3 +
    this.repairsResolved * 15 +
    this.ratingsGiven * 2 +
    Math.floor(this.satisfactionRating * 20);
  this.builderRewardsEarned = Math.floor(this.builderScore * 0.3);
};

BuilderStatsSchema.index({ builderScore: -1 });
BuilderStatsSchema.index({ userId: 1 });

export interface IBuilderStats {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  address?: string;
  issuesRaised: number;
  repairsResolved: number;
  ratingsGiven: number;
  satisfactionRating: number;
  builderScore: number;
  builderRewardsEarned: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.BuilderStats ||
  mongoose.model<IBuilderStats>('BuilderStats', BuilderStatsSchema);
