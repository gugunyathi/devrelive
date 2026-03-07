/**
 * call-credits.ts
 * Tracks the daily free call allowance per wallet using localStorage.
 * One free call (3 min) is granted every 24 hours per address.
 */

const PREFIX = 'devrelive_free_call_';

function storageKey(address: string): string {
  return PREFIX + address.toLowerCase();
}

/** Returns true if the user hasn't used their free call yet today. */
export function hasFreeCallAvailable(address: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return true;
    const { date } = JSON.parse(raw) as { date: string };
    return date !== new Date().toDateString();
  } catch {
    return true;
  }
}

/** Marks the free call as used for today. Call this when starting a free call. */
export function consumeFreeCall(address: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(address), JSON.stringify({ date: new Date().toDateString() }));
  } catch {
    // ignore storage errors
  }
}
