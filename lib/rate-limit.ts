import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Only initialise the client when env vars are present so the app
// runs locally without a Redis instance (rate-limiting is skipped).
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function makeRatelimit(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window) });
}

// Per-user limits for expensive AI / storage endpoints
export const scraperLimit   = makeRatelimit(10, '1 m');  // 10 scrapes / min / user
export const visionLimit    = makeRatelimit(5,  '1 m');  // 5 vision scans / min / user
export const uploadLimit    = makeRatelimit(20, '1 m');  // 20 uploads / min / user

/**
 * Check rate limit for a given userId.
 * Returns a 429 NextResponse if the limit is exceeded, or null if OK.
 * If Redis is not configured, always returns null (fail-open).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<NextResponse | null> {
  if (!limiter) return null;

  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  if (success) return null;

  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit':     String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset':     String(reset),
        'Retry-After':           String(Math.ceil((reset - Date.now()) / 1000)),
      },
    }
  );
}
