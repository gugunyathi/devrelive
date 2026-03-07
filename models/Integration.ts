import mongoose from 'mongoose';

const IntegrationSchema = new mongoose.Schema(
  {
    userAddress: { type: String, required: true, lowercase: true },
    integrationId: { type: String, required: true },
    connected: { type: Boolean, default: true },
    connectedAt: { type: Date, default: Date.now },
    disconnectedAt: { type: Date },
    // Per-integration metadata (e.g. telegramUserId, telegramUsername, guildId, etc.)
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// One integration per user per service
IntegrationSchema.index({ userAddress: 1, integrationId: 1 }, { unique: true });
IntegrationSchema.index({ integrationId: 1 });
// Allow looking up by Telegram user ID for incoming messages
IntegrationSchema.index({ 'meta.telegramUserId': 1 }, { sparse: true });

export interface IIntegration {
  userAddress: string;
  integrationId: string;
  connected: boolean;
  connectedAt: Date;
  disconnectedAt?: Date;
  meta: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Integration || mongoose.model<IIntegration>('Integration', IntegrationSchema);
