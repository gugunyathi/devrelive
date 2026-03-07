/**
 * In-memory store for Telegram connect tokens.
 * Token maps to { address, status, telegramUser }
 * Replace with Redis in production for multi-instance deployments.
 */
export interface TelegramConnectEntry {
  address: string;
  createdAt: number;
  status: 'pending' | 'confirmed';
  telegramUserId?: number;
  telegramUsername?: string;
  telegramFirstName?: string;
}

// token → entry
export const telegramTokens = new Map<string, TelegramConnectEntry>();

// Auto-expire tokens after 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [token, entry] of telegramTokens.entries()) {
    if (entry.createdAt < cutoff) telegramTokens.delete(token);
  }
}, 60 * 1000);
