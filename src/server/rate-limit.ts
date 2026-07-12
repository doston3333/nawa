export type RateLimitBucket = "session_start" | "attempt";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

/** Process-local counters — fine for single-node demo; multi-node needs Redis. */
const store = new Map<string, Counter>();

const LIMITS: Record<RateLimitBucket, { limit: number; windowMs: number }> = {
  session_start: { limit: 10, windowMs: 60 * 60 * 1000 },
  attempt: { limit: 120, windowMs: 60 * 60 * 1000 },
};

export function rateLimitKey(bucket: RateLimitBucket, id: string): string {
  return `${bucket}:${id}`;
}

export function checkRateLimit(bucket: RateLimitBucket, id: string, now = Date.now()): RateLimitResult {
  const config = LIMITS[bucket];
  if (process.env.E2E_ALLOW_RATE_LIMIT_BYPASS === "true") {
    return { allowed: true, remaining: config.limit, retryAfterSec: 0, limit: config.limit };
  }
  const key = rateLimitKey(bucket, id);
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfterSec: Math.ceil(config.windowMs / 1000),
      limit: config.limit,
    };
  }

  if (current.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      limit: config.limit,
    };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    remaining: config.limit - current.count,
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    limit: config.limit,
  };
}

/** Test helper */
export function resetRateLimitsForTests(): void {
  store.clear();
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
