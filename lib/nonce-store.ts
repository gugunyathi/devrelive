/**
 * In-memory nonce store shared between /api/auth/nonce and /api/auth/verify.
 * In production, replace with Redis or a short-TTL DB collection.
 */
export const nonces = new Set<string>();

// Auto-clear every 10 minutes to prevent unbounded growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => nonces.clear(), 10 * 60 * 1000);
}
