import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Integration from '@/models/Integration';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';

/**
 * POST /api/telegram/notify
 * Send a Telegram message to a user who has connected their Telegram account.
 *
 * Body:
 *   { address: string; message: string; parseMode?: 'HTML' | 'Markdown' }
 *   — or —
 *   { telegramUserId: number; message: string; parseMode?: 'HTML' | 'Markdown' }
 */
export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 503 });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { address, telegramUserId: directId, message, parseMode = 'HTML' } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    let chatId: number | undefined = directId;

    // Look up by wallet address if no direct Telegram ID
    if (!chatId && address) {
      const integration = await Integration.findOne({
        userAddress: address.toLowerCase(),
        integrationId: 'telegram',
        connected: true,
      }).lean();

      if (!integration) {
        return NextResponse.json({ error: 'User has not connected Telegram' }, { status: 404 });
      }
      chatId = (integration.meta as Record<string, unknown>)?.telegramUserId as number;
    }

    if (!chatId) {
      return NextResponse.json({ error: 'Could not resolve Telegram chat ID' }, { status: 400 });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: parseMode }),
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('[telegram notify] Telegram API error:', tgData);
      return NextResponse.json({ error: tgData.description ?? 'Telegram send failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, messageId: tgData.result?.message_id });
  } catch (err) {
    console.error('[POST /api/telegram/notify]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
