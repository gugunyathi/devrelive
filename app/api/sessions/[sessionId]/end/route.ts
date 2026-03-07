import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WalletSession from '@/models/WalletSession';
import { sendTelegramNotification } from '@/lib/telegram';

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

    // Fire-and-forget Telegram notification
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const durationLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    sendTelegramNotification(
      session.address,
      `📞 <b>Session Ended</b>\n\nYour DevReLive session has ended.\nDuration: <b>${durationLabel}</b>`,
      'HTML'
    ).catch(() => {});

    return NextResponse.json({ ok: true, duration: durationSeconds }, { status: 200 });
  } catch (err) {
    console.error('[PUT /api/sessions/[sessionId]/end]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
