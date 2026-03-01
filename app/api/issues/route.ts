import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Issue from '@/models/Issue';

// GET /api/issues — list issues with filters
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const address = searchParams.get('address')?.toLowerCase();
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const skip = parseInt(searchParams.get('skip') ?? '0');

    const query: Record<string, unknown> = {};
    if (address) query.address = address;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const [issues, total] = await Promise.all([
      Issue.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Issue.countDocuments(query),
    ]);

    return NextResponse.json({ issues, total }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/issues]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/issues — open a new issue
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, address, topic, description, callId, priority } = body;

    if (!userId || !address || !topic) {
      return NextResponse.json({ error: 'userId, address, and topic are required' }, { status: 400 });
    }

    // Generate human-readable issue ID: ISS-XXXX
    const count = await Issue.countDocuments();
    const issueId = `ISS-${String(count + 1).padStart(4, '0')}`;

    const issue = await Issue.create({
      issueId,
      userId,
      address: address.toLowerCase(),
      topic,
      description,
      callId,
      priority: priority ?? 'medium',
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/issues]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
