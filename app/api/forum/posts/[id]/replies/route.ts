import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumReply from '@/models/ForumReply';
import ForumPost from '@/models/ForumPost';
import crypto from 'crypto';

// GET /api/forum/posts/[id]/replies — list replies for a post
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const replies = await ForumReply.find({ postId: id }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ replies, total: replies.length }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/forum/posts/[id]/replies]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/forum/posts/[id]/replies — create a reply on a post
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { author, authorAddress, role, content, hasImage, imageUrl } = body;

    if (!author) {
      return NextResponse.json({ error: 'author is required' }, { status: 400 });
    }

    // Verify post exists
    const post = await ForumPost.findOne({ postId: id });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const replyId = `reply_${crypto.randomBytes(8).toString('hex')}`;

    const reply = await ForumReply.create({
      replyId,
      postId: id,
      author,
      authorAddress: authorAddress?.toLowerCase(),
      role: role || 'user',
      content: content || '',
      hasImage: hasImage || false,
      imageUrl,
    });

    // Increment reply count on the post
    await ForumPost.findOneAndUpdate(
      { postId: id },
      { $inc: { replyCount: 1 } }
    );

    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/forum/posts/[id]/replies]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
