import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Issue from '@/models/Issue';
import { sendTelegramNotification } from '@/lib/telegram';

type Params = { params: Promise<{ id: string }> };

// GET /api/issues/[id]
export async function GET(_req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;

    const issue = await Issue.findOne({ issueId: id }).lean();
    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ issue }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/issues/[id]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/issues/[id] — update issue status, priority, resolution, assignment
export async function PUT(req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const allowed = ['status', 'priority', 'resolution', 'assignedTo', 'assignedToName', 'description'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    // Set timestamps based on status transitions
    if (body.status === 'resolved') update.resolvedAt = new Date();
    if (body.status === 'closed') update.closedAt = new Date();

    const issue = await Issue.findOneAndUpdate(
      { issueId: id },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fire-and-forget Telegram notifications on key status transitions
    if (body.status === 'resolved') {
      sendTelegramNotification(
        issue.address,
        `✅ <b>Issue Resolved</b>\n\n<b>${issue.topic}</b>\n\n${issue.resolution ? `Resolution: ${issue.resolution}` : ''}`,
        'HTML'
      ).catch(() => {});
    } else if (body.status === 'escalated') {
      sendTelegramNotification(
        issue.address,
        `⚠️ <b>Issue Escalated</b>\n\n<b>${issue.topic}</b>\n\nYour issue has been escalated for urgent attention.`,
        'HTML'
      ).catch(() => {});
    }

    return NextResponse.json({ issue }, { status: 200 });
  } catch (err) {
    console.error('[PUT /api/issues/[id]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
