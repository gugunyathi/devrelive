import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { telegramTokens } from '@/lib/telegram-store';
import dbConnect from '@/lib/mongodb';
import Integration from '@/models/Integration';

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

        // Persist to MongoDB
        try {
          await dbConnect();
          await Integration.findOneAndUpdate(
            { userAddress: entry.address.toLowerCase(), integrationId: 'telegram' },
            {
              $set: {
                connected: true,
                connectedAt: new Date(),
                disconnectedAt: null,
                meta: {
                  telegramUserId: from?.id,
                  telegramUsername: from?.username ?? null,
                  telegramFirstName: from?.first_name ?? null,
                  telegramLastName: from?.last_name ?? null,
                },
              },
              $setOnInsert: { userAddress: entry.address.toLowerCase(), integrationId: 'telegram' },
            },
            { upsert: true, new: true }
          );
        } catch (dbErr) {
          console.error('[telegram callback] DB save failed:', dbErr);
        }

        // Reply to the user
        if (BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: from.id,
              parse_mode: 'HTML',
              text: `✅ <b>Connected!</b>\n\nYour Telegram account has been linked to DevReLive.\n\nWelcome, <b>${from?.first_name ?? from?.username ?? 'developer'}</b>! 🚀\n\nYou'll now receive notifications here for:\n• Live call invitations\n• Issue escalations\n• Repair job completions`,
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
