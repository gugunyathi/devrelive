import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CallHistory from '@/models/CallHistory';

type Params = { params: Promise<{ callId: string }> };

// GET /api/calls/[callId] — fetch a single call with full transcript
export async function GET(_req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { callId } = await params;

    const call = await CallHistory.findOne({ callId }).lean();

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json({ call }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/calls/[callId]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/calls/[callId] — update call status or resolution
export async function PATCH(req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { callId } = await params;
    const body = await req.json();

    const allowed = ['status', 'resolution', 'endTime', 'duration', 'hasHumanDevRel', 'escalatedTo'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const call = await CallHistory.findOneAndUpdate(
      { callId },
      { $set: update },
      { new: true }
    );

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json({ call }, { status: 200 });
  } catch (err) {
    console.error('[PATCH /api/calls/[callId]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
