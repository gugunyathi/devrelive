import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CallHistory from '@/models/CallHistory';

type Params = { params: Promise<{ address: string }> };

// GET /api/users/[address]/history — all calls for a wallet address
export async function GET(req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { address } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const skip = parseInt(searchParams.get('skip') ?? '0');

    const calls = await CallHistory.find({ hostAddress: address.toLowerCase() })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await CallHistory.countDocuments({ hostAddress: address.toLowerCase() });

    return NextResponse.json({ calls, total, limit, skip }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/users/[address]/history]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
