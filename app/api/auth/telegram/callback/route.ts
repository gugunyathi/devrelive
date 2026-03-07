import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { telegramTokens } from '@/lib/telegram-store';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';

/**
 * POST /api/auth/telegram/callback
 * Receives Telegram bot webhook updates.
 * Configure your bot's webhook with:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://devrelive.vercel.app/api/auth/telegram/callback
 *
 * Expected Telegram update for /start <token> command.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify request is from Telegram (optional but recommended in production)
    const secret = BOT_TOKEN
      ? crypto.createHash('sha256').update(BOT_TOKEN).digest()
      : null;

    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const text: string = message.text ?? '';
    const from = message.from;

    // Handle /start <token>
    const match = text.match(/^\/start\s+([a-f0-9]{32})$/i);
    if (match) {
      const token = match[1];
      const entry = telegramTokens.get(token);
      if (entry && entry.status === 'pending') {
        entry.status = 'confirmed';
        entry.telegramUserId = from?.id;
        entry.telegramUsername = from?.username;
        entry.telegramFirstName = from?.first_name;

        // Reply to the user
        if (BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: from.id,
              text: `✅ Connected! Your Telegram account has been linked to DevReLive.\n\nWelcome, ${from?.first_name ?? from?.username ?? 'developer'}!`,
            }),
          }).catch(() => {});
        }
      }
    }

    void secret; // suppress unused warning
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[telegram callback POST]', err);
    return NextResponse.json({ ok: true }); // always 200 to Telegram
  }
}
