import mongoose from 'mongoose';

const ForumReplySchema = new mongoose.Schema(
  {
    replyId: { type: String, required: true, unique: true },
    postId: { type: String, required: true, index: true },
    author: { type: String, required: true },
    authorAddress: { type: String, lowercase: true },
    role: {
      type: String,
      enum: ['user', 'admin', 'ai', 'devrel'],
      default: 'user',
    },
    content: { type: String, default: '' },
    hasImage: { type: Boolean, default: false },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

ForumReplySchema.index({ postId: 1, createdAt: 1 });
ForumReplySchema.index({ authorAddress: 1 });

export interface IForumReply {
  replyId: string;
  postId: string;
  author: string;
  authorAddress?: string;
  role: 'user' | 'admin' | 'ai' | 'devrel';
  content: string;
  hasImage: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.ForumReply || mongoose.model<IForumReply>('ForumReply', ForumReplySchema);
