import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';

// GET /api/forum/posts/[id] — get a single post
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const post = await ForumPost.findOne({ postId: id }).lean();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/forum/posts/[id]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/forum/posts/[id] — update post (toggle resolve, edit, etc.)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const allowed = ['title', 'content', 'tags', 'resolved', 'hasImage', 'imageUrl'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    // Auto-set resolvedAt when resolved changes
    if (updates.resolved === true) {
      updates.resolvedAt = new Date();
    } else if (updates.resolved === false) {
      updates.resolvedAt = null;
    }

    const post = await ForumPost.findOneAndUpdate(
      { postId: id },
      { $set: updates },
      { new: true }
    ).lean();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post }, { status: 200 });
  } catch (err) {
    console.error('[PATCH /api/forum/posts/[id]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/forum/posts/[id] — delete a post
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const post = await ForumPost.findOneAndDelete({ postId: id });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('[DELETE /api/forum/posts/[id]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
