import Integration from '@/models/Integration';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';

/**
 * Send a plain or HTML Telegram message to a user identified by their wallet address.
 * Returns true on success, false if the user hasn't connected Telegram or send failed.
 */
export async function sendTelegramNotification(
  address: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    const integration = await Integration.findOne({
      userAddress: address.toLowerCase(),
      integrationId: 'telegram',
      connected: true,
    }).lean();

    if (!integration) return false;

    const chatId = (integration.meta as Record<string, unknown>)?.telegramUserId;
    if (!chatId) return false;

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: parseMode }),
    });

    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Send a Telegram message directly to a known chat ID.
 */
export async function sendTelegramMessage(
  chatId: number,
  message: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: parseMode }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
