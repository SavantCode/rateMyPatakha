/**
 * Lightweight in-memory sliding-window rate limiter to protect API endpoints
 * during viral traffic spikes.
 */
interface RateBucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  patakhaRateBuckets?: Map<string, RateBucket>;
};

function getBuckets(): Map<string, RateBucket> {
  if (!globalForRateLimit.patakhaRateBuckets) {
    globalForRateLimit.patakhaRateBuckets = new Map<string, RateBucket>();
  }
  return globalForRateLimit.patakhaRateBuckets;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const buckets = getBuckets();

  // Periodic cleanup to prevent memory growth
  if (buckets.size > 5000) {
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: maxRequests - existing.count };
}