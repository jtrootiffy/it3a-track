/**
 * Small in-memory sliding-window limiter for the login endpoint.
 *
 * Serverless instances do not share memory, so this blunts casual brute force
 * rather than stopping a distributed attack. Supabase Auth applies its own
 * per-account throttling on top.
 */
const buckets = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 5000;

export function checkRateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();

  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}
