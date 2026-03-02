import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CallHistory from '@/models/CallHistory';
import Issue from '@/models/Issue';
import WalletSession from '@/models/WalletSession';
import ForumPost from '@/models/ForumPost';
import ForumReply from '@/models/ForumReply';
import CostRecord from '@/models/CostRecord';
import Integration from '@/models/Integration';

// GET /api/admin/stats — aggregate stats for the admin dashboard
export async function GET() {
  try {
    await dbConnect();

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [
      totalUsers,
      totalCalls,
      activeSessions,
      openIssues,
      escalatedIssues,
      resolvedToday,
      recentCalls,
      // Forum stats
      totalPosts,
      resolvedPosts,
      unresolvedPosts,
      telegramPosts,
      totalReplies,
      postsToday,
      // Cost stats
      totalCostRecords,
      costAggregation,
      // Integration stats
      totalConnections,
    ] = await Promise.all([
      User.countDocuments(),
      CallHistory.countDocuments(),
      WalletSession.countDocuments({ isActive: true }),
      Issue.countDocuments({ status: 'open' }),
      Issue.countDocuments({ status: 'escalated' }),
      Issue.countDocuments({
        status: 'resolved',
        resolvedAt: { $gte: todayStart },
      }),
      // Last 10 calls for the dashboard
      CallHistory.find()
        .sort({ startTime: -1 })
        .limit(10)
        .select('callId channelName hostAddress duration status startTime transcript hasHumanDevRel')
        .lean(),
      // Forum
      ForumPost.countDocuments(),
      ForumPost.countDocuments({ resolved: true }),
      ForumPost.countDocuments({ resolved: false }),
      ForumPost.countDocuments({ source: 'telegram' }),
      ForumReply.countDocuments(),
      ForumPost.countDocuments({ createdAt: { $gte: todayStart } }),
      // Costs
      CostRecord.countDocuments(),
      CostRecord.aggregate([
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$totalCost' },
            totalCallMinutes: { $sum: '$callDurationMins' },
            avgCostPerTicket: { $avg: '$totalCost' },
          },
        },
      ]),
      // Integrations
      Integration.countDocuments({ connected: true }),
    ]);

    const costAgg = costAggregation[0] || { totalCost: 0, totalCallMinutes: 0, avgCostPerTicket: 0 };

    return NextResponse.json(
      {
        stats: {
          totalUsers,
          totalCalls,
          activeSessions,
          openIssues,
          escalatedIssues,
          resolvedToday,
          // Forum
          forum: {
            totalPosts,
            resolvedPosts,
            unresolvedPosts,
            telegramPosts,
            totalReplies,
            postsToday,
            resolutionRate: totalPosts > 0 ? Math.round((resolvedPosts / totalPosts) * 100) : 0,
          },
          // Costs
          costs: {
            totalRecords: totalCostRecords,
            totalCost: Math.round(costAgg.totalCost * 100) / 100,
            totalCallMinutes: Math.round(costAgg.totalCallMinutes),
            avgCostPerTicket: Math.round(costAgg.avgCostPerTicket * 100) / 100,
          },
          // Integrations
          integrations: {
            totalConnections,
          },
        },
        recentCalls,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[GET /api/admin/stats]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
