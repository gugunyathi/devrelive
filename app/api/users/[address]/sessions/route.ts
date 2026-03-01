import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WalletSession from '@/models/WalletSession';

type Params = { params: Promise<{ address: string }> };

// GET /api/users/[address]/sessions — wallet session history
export async function GET(req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { address } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);

    const sessions = await WalletSession.find({ address: address.toLowerCase() })
      .sort({ signedInAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/users/[address]/sessions]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
