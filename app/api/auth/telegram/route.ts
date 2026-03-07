import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { telegramTokens } from '@/lib/telegram-store';

const BOT_NAME = process.env.TELEGRAM_BOT_NAME ?? 'DevReliveBot';

/**
 * POST /api/auth/telegram
 * Generates a connect token and returns the bot deep-link.
 * Body: { address: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

    const token = crypto.randomBytes(16).toString('hex');
    telegramTokens.set(token, { address, createdAt: Date.now(), status: 'pending' });

    const botUrl = `https://t.me/${BOT_NAME}?start=${token}`;
    return NextResponse.json({ token, botUrl, botName: BOT_NAME });
  } catch (err) {
    console.error('[telegram auth POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/auth/telegram?token=...
 * Poll for connection status.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const entry = telegramTokens.get(token);
  if (!entry) return NextResponse.json({ status: 'expired' });

  return NextResponse.json({
    status: entry.status,
    telegramUsername: entry.telegramUsername,
    telegramFirstName: entry.telegramFirstName,
  });
}
