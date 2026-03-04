import mongoose from 'mongoose';

const CommitResultSchema = new mongoose.Schema({
  file: String,
  success: Boolean,
  description: String,
  error: String,
}, { _id: false });

const IssueSchema = new mongoose.Schema({
  file: String,
  issue: String,
  severity: { type: String, enum: ['high', 'medium', 'low'] },
}, { _id: false });

const RepairHistorySchema = new mongoose.Schema(
  {
    githubUsername: { type: String, index: true },
    repoOwner: String,
    repoName: String,
    branch: String,
    appUrl: String,
    repoUrl: String,
    issuesFound: Number,
    issuesFixed: Number,
    issues: [IssueSchema],
    fixes: [CommitResultSchema],
    summary: String,
    commitUrl: String,
    durationMs: Number,
    status: { type: String, enum: ['success', 'partial', 'error'], default: 'success' },
  },
  { timestamps: true }
);

RepairHistorySchema.index({ createdAt: -1 });
RepairHistorySchema.index({ githubUsername: 1, createdAt: -1 });

const RepairHistory =
  mongoose.models.RepairHistory ??
  mongoose.model('RepairHistory', RepairHistorySchema);

export default RepairHistory;
