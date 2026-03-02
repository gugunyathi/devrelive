import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CostRecord from '@/models/CostRecord';
import crypto from 'crypto';

// GET /api/costs — list cost records with filters
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const skip = parseInt(searchParams.get('skip') ?? '0');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (source) query.source = source;

    const [records, total] = await Promise.all([
      CostRecord.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CostRecord.countDocuments(query),
    ]);

    return NextResponse.json({ records, total }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/costs]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/costs — create a new cost record
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const {
      postId, issueId, title, timeToResolve, callDurationMins,
      status, source, unitCostPerMinute, baseTicketCost,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const costId = `cost_${crypto.randomBytes(8).toString('hex')}`;
    const unitCost = unitCostPerMinute ?? 2.5;
    const baseCost = baseTicketCost ?? 10.0;
    const mins = callDurationMins ?? 0;
    const totalCost = baseCost + (mins * unitCost);

    const record = await CostRecord.create({
      costId,
      postId,
      issueId,
      title,
      timeToResolve,
      callDurationMins: mins,
      status: status || 'open',
      source: source || 'web',
      unitCostPerMinute: unitCost,
      baseTicketCost: baseCost,
      totalCost,
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/costs]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
