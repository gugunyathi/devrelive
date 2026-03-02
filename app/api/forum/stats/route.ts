import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';
import ForumReply from '@/models/ForumReply';

// GET /api/forum/stats — aggregate forum statistics
export async function GET() {
  try {
    await dbConnect();

    const [
      totalPosts,
      resolvedPosts,
      unresolvedPosts,
      telegramPosts,
      discordPosts,
      webPosts,
      totalReplies,
    ] = await Promise.all([
      ForumPost.countDocuments(),
      ForumPost.countDocuments({ resolved: true }),
      ForumPost.countDocuments({ resolved: false }),
      ForumPost.countDocuments({ source: 'telegram' }),
      ForumPost.countDocuments({ source: 'discord' }),
      ForumPost.countDocuments({ source: 'web' }),
      ForumReply.countDocuments(),
    ]);

    // Posts created today
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const postsToday = await ForumPost.countDocuments({ createdAt: { $gte: todayStart } });
    const resolvedToday = await ForumPost.countDocuments({
      resolved: true,
      resolvedAt: { $gte: todayStart },
    });

    // Tag distribution
    const tagDistribution = await ForumPost.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    return NextResponse.json(
      {
        stats: {
          totalPosts,
          resolvedPosts,
          unresolvedPosts,
          telegramPosts,
          discordPosts,
          webPosts,
          totalReplies,
          postsToday,
          resolvedToday,
          resolutionRate: totalPosts > 0 ? Math.round((resolvedPosts / totalPosts) * 100) : 0,
        },
        tagDistribution: tagDistribution.map((t) => ({ tag: t._id, count: t.count })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[GET /api/forum/stats]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
