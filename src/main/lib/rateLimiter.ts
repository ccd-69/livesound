/**
 * Simple in-memory rate limiter for API calls.
 * Prevents hitting Spotify/YouTube API quotas with rapid user actions.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const limits = new Map<string, RateLimitEntry>();

/**
 * Check if an action is allowed under the rate limit.
 * @param key - Unique identifier for the action (e.g., 'spotify:play', 'youtube:search')
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 1000): boolean {
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    limits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return true;
  }

  console.warn(`[RateLimiter] Rate limit exceeded for ${key} (${maxRequests}/${windowMs}ms)`);
  return false;
}

/**
 * Wrapper for async functions with rate limiting.
 * Returns a rejected promise if rate limited.
 */
export async function withRateLimit<T>(
  key: string,
  fn: () => Promise<T>,
  maxRequests: number = 10,
  windowMs: number = 1000
): Promise<T> {
  if (!checkRateLimit(key, maxRequests, windowMs)) {
    throw new Error(`Rate limit exceeded for ${key}`);
  }
  return fn();
}

/**
 * Clean up expired entries to prevent memory leaks.
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of limits.entries()) {
    if (now > entry.resetTime) {
      limits.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
