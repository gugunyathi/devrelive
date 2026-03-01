import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WalletSession from '@/models/WalletSession';

type Params = { params: Promise<{ sessionId: string }> };

// PUT /api/sessions/[sessionId]/end — close an active wallet session on sign-out
export async function PUT(_req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { sessionId } = await params;

    const session = await WalletSession.findOne({ sessionId });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const now = new Date();
    const durationSeconds = Math.round(
      (now.getTime() - session.signedInAt.getTime()) / 1000
    );

    await WalletSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          isActive: false,
          signedOutAt: now,
          duration: durationSeconds,
        },
      }
    );

    return NextResponse.json({ ok: true, duration: durationSeconds }, { status: 200 });
  } catch (err) {
    console.error('[PUT /api/sessions/[sessionId]/end]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
