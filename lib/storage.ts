/**
 * SSR-safe localStorage helpers for MyStackd data persistence.
 * When Supabase is integrated, replace the body of each function
 * with DB calls and remove these helpers.
 *
 * Keys are namespaced by user ID so multiple accounts in the same
 * browser never share data:
 *   ms_{userId}_{key}   — when a user is logged in
 *   ms_{key}            — for global keys (session, users_store)
 */

const PREFIX = "ms_";

// ─── Current user ─────────────────────────────────────────────────────────────

let _currentUserId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  _currentUserId = id;
}

export function getCurrentUserId(): string | null {
  return _currentUserId;
}

/** Build the full localStorage key, scoped to the current user when set. */
function buildKey(key: string): string {
  return _currentUserId ? `${PREFIX}${_currentUserId}_${key}` : `${PREFIX}${key}`;
}

// ─── List helpers ─────────────────────────────────────────────────────────────

export function loadList<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(buildKey(key));
    if (raw) return JSON.parse(raw) as T[];
  } catch {}
  // Seed localStorage with mock data on first visit for this user
  saveList(key, fallback);
  return fallback;
}

export function saveList<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(buildKey(key), JSON.stringify(data));
  } catch {}
}

// ─── Object helpers ───────────────────────────────────────────────────────────

export function loadObject<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(buildKey(key));
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

export function saveObject<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(buildKey(key), JSON.stringify(data));
  } catch {}
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Called on logout — wipes all data scoped to the current user,
 * plus the session key. Leaves ms_users_store intact so other
 * accounts can still log in.
 */
export function clearAllStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const prefix = _currentUserId
      ? `${PREFIX}${_currentUserId}_`
      : PREFIX;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keysToRemove.push(k);
    }
    // Also remove the global session key
    keysToRemove.push(`${PREFIX}session`);
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
