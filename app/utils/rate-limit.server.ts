/**
 * A small fixed-window rate limiter kept in memory. It's enough for a single
 * app container; with several instances each one counts on its own, so move
 * it to Redis or the database before scaling out.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/**
 * Counts one hit for `key`. Returns false once more than `limit` hits fall
 * in the current window of `windowMs`.
 */
export function consumeRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}) {
  sweep(now);
  const window = windows.get(key);
  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  window.count += 1;
  return window.count <= limit;
}

/** Forgets every window. For tests. */
export function resetRateLimits() {
  windows.clear();
}

/** The client's address, as forwarded by the reverse proxy. */
export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
