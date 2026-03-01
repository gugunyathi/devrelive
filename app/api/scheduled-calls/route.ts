import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduledCall from '@/models/ScheduledCall';

// GET /api/scheduled-calls — list scheduled calls (filter by address or userId)
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const address = searchParams.get('address')?.toLowerCase();
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const from = searchParams.get('from'); // ISO date string
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

    const query: Record<string, unknown> = {};
    if (address) query.address = address;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (from) query.scheduledAt = { $gte: new Date(from) };

    const calls = await ScheduledCall.find(query)
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ calls }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/scheduled-calls]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/scheduled-calls — book a new scheduled call
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const { userId, address, title, topic, notes, scheduledAt, durationMinutes, devrel } = body;

    if (!userId || !address || !title || !scheduledAt) {
      return NextResponse.json(
        { error: 'userId, address, title, and scheduledAt are required' },
        { status: 400 }
      );
    }

    const call = await ScheduledCall.create({
      userId,
      address: address.toLowerCase(),
      title,
      topic,
      notes,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes ?? 30,
      devrel,
      status: 'pending',
    });

    return NextResponse.json({ call }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/scheduled-calls]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
