import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';
import ForumReply from '@/models/ForumReply';
import crypto from 'crypto';

// GET /api/forum/posts — list posts with filters
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const channelId = searchParams.get('channelId');
    const source = searchParams.get('source');
    const resolved = searchParams.get('resolved');
    const tag = searchParams.get('tag');
    const authorAddress = searchParams.get('authorAddress')?.toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const skip = parseInt(searchParams.get('skip') ?? '0');

    const query: Record<string, unknown> = {};
    if (channelId) query.channelId = channelId;
    if (source) query.source = source;
    if (resolved !== null && resolved !== undefined && resolved !== '') {
      query.resolved = resolved === 'true';
    }
    if (tag) query.tags = tag;
    if (authorAddress) query.authorAddress = authorAddress;

    const [posts, total] = await Promise.all([
      ForumPost.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ForumPost.countDocuments(query),
    ]);

    return NextResponse.json({ posts, total }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/forum/posts]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/forum/posts — create a new forum post
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { title, content, author, authorAddress, channelId, tags, hasImage, imageUrl, source } = body;

    if (!title || !author) {
      return NextResponse.json({ error: 'title and author are required' }, { status: 400 });
    }

    const postId = `post_${crypto.randomBytes(8).toString('hex')}`;

    const post = await ForumPost.create({
      postId,
      channelId: channelId || 'developer-forum',
      title,
      content: content || '',
      author,
      authorAddress: authorAddress?.toLowerCase(),
      tags: tags || [],
      hasImage: hasImage || false,
      imageUrl,
      source: source || 'web',
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/forum/posts]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/forum/posts — seed initial posts (admin utility)
export async function DELETE() {
  try {
    await dbConnect();
    // Wipe and re-seed — only for development
    await ForumPost.deleteMany({});
    await ForumReply.deleteMany({});
    return NextResponse.json({ ok: true, message: 'Forum data cleared' }, { status: 200 });
  } catch (err) {
    console.error('[DELETE /api/forum/posts]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
