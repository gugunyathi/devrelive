import mongoose from 'mongoose';

const ForumPostSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true, default: 'developer-forum' },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    author: { type: String, required: true },
    authorAddress: { type: String, lowercase: true },
    replyCount: { type: Number, default: 0 },
    tags: [{ type: String }],
    hasImage: { type: Boolean, default: false },
    imageUrl: { type: String },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    source: {
      type: String,
      enum: ['discord', 'telegram', 'web'],
      default: 'web',
    },
  },
  { timestamps: true }
);

ForumPostSchema.index({ channelId: 1, createdAt: -1 });
ForumPostSchema.index({ postId: 1 });
ForumPostSchema.index({ authorAddress: 1 });
ForumPostSchema.index({ resolved: 1 });
ForumPostSchema.index({ source: 1 });
ForumPostSchema.index({ tags: 1 });

export interface IForumPost {
  postId: string;
  channelId: string;
  title: string;
  content: string;
  author: string;
  authorAddress?: string;
  replyCount: number;
  tags: string[];
  hasImage: boolean;
  imageUrl?: string;
  resolved: boolean;
  resolvedAt?: Date;
  source: 'discord' | 'telegram' | 'web';
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.ForumPost || mongoose.model<IForumPost>('ForumPost', ForumPostSchema);
