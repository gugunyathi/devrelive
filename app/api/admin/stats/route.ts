import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CallHistory from '@/models/CallHistory';
import Issue from '@/models/Issue';
import WalletSession from '@/models/WalletSession';

// GET /api/admin/stats — aggregate stats for the admin dashboard
export async function GET() {
  try {
    await dbConnect();

    const [
      totalUsers,
      totalCalls,
      activeSessions,
      openIssues,
      escalatedIssues,
      resolvedToday,
      recentCalls,
    ] = await Promise.all([
      User.countDocuments(),
      CallHistory.countDocuments(),
      WalletSession.countDocuments({ isActive: true }),
      Issue.countDocuments({ status: 'open' }),
      Issue.countDocuments({ status: 'escalated' }),
      Issue.countDocuments({
        status: 'resolved',
        resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      // Last 10 calls for the dashboard
      CallHistory.find()
        .sort({ startTime: -1 })
        .limit(10)
        .select('callId channelName hostAddress duration status startTime transcript hasHumanDevRel')
        .lean(),
    ]);

    return NextResponse.json(
      {
        stats: {
          totalUsers,
          totalCalls,
          activeSessions,
          openIssues,
          escalatedIssues,
          resolvedToday,
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
