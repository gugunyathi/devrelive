import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduledCall from '@/models/ScheduledCall';

type Params = { params: Promise<{ id: string }> };

// GET /api/scheduled-calls/[id]
export async function GET(_req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;

    const call = await ScheduledCall.findOne({ scheduledCallId: id }).lean();
    if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ call }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/scheduled-calls/[id]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/scheduled-calls/[id] — update title, time, status, etc.
export async function PUT(req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const allowed = ['title', 'topic', 'notes', 'scheduledAt', 'durationMinutes', 'devrel', 'status', 'callId'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        update[key] = key === 'scheduledAt' ? new Date(body[key]) : body[key];
      }
    }

    const call = await ScheduledCall.findOneAndUpdate(
      { scheduledCallId: id },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ call }, { status: 200 });
  } catch (err) {
    console.error('[PUT /api/scheduled-calls/[id]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/scheduled-calls/[id] — cancel a scheduled call
export async function DELETE(_req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;

    await ScheduledCall.findOneAndUpdate(
      { scheduledCallId: id },
      { $set: { status: 'cancelled' } }
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('[DELETE /api/scheduled-calls/[id]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
