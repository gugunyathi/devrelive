import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CallHistory from '@/models/CallHistory';
import User from '@/models/User';

// POST /api/calls — save a completed call and update user stats
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      channelName,
      topic,
      hostAddress,
      hostUserId,
      participants = [],
      transcript = [],
      startTime,
      endTime,
      duration = 0,
      hasHumanDevRel = false,
      resolution,
    } = body;

    if (!channelName || !hostAddress) {
      return NextResponse.json(
        { error: 'channelName and hostAddress are required' },
        { status: 400 }
      );
    }

    const call = await CallHistory.create({
      channelName,
      topic,
      hostAddress: hostAddress.toLowerCase(),
      hostUserId,
      participants: participants.map((p: { address?: string; userId?: string; role?: string }) => ({
        ...p,
        address: p.address?.toLowerCase(),
      })),
      transcript,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : new Date(),
      duration,
      hasHumanDevRel,
      resolution,
      status: 'ended',
    });

    // Increment user stats asynchronously — don't block response
    if (hostAddress) {
      User.findOneAndUpdate(
        { address: hostAddress.toLowerCase() },
        {
          $inc: {
            'stats.totalCalls': 1,
            'stats.totalMessages': transcript.length,
            'stats.totalDuration': duration,
          },
          $set: { lastSeenAt: new Date() },
        }
      ).catch((e: Error) => console.error('Failed to update user stats:', e));
    }

    return NextResponse.json({ call }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/calls]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/calls — list calls with optional filters
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const address = searchParams.get('address')?.toLowerCase();
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const skip = parseInt(searchParams.get('skip') ?? '0');

    // Build query
    const query: Record<string, unknown> = {};
    if (address) query.hostAddress = address;
    if (userId) query.hostUserId = userId;
    if (status) query.status = status;

    const [calls, total] = await Promise.all([
      CallHistory.find(query).sort({ startTime: -1 }).skip(skip).limit(limit).lean(),
      CallHistory.countDocuments(query),
    ]);

    return NextResponse.json({ calls, total, limit, skip }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/calls]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
