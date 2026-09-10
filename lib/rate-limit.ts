export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetMs: number
  retryAfterSeconds: number
}

interface RateLimitEntry {
  timestamps: number[]
}

// In-memory store for rate limiting with sliding-window algorithm
const store = new Map<string, RateLimitEntry>()

// Periodically clean up entries older than the longest window (10 minutes)
const CLEANUP_THRESHOLD = 1000

function cleanupExpiredEntries(windowMs: number) {
  const threshold = Date.now() - windowMs
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > threshold)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

/**
 * Checks and increments rate limit for a given key using a sliding-window counter.
 *
 * @param key - Pseudonymised client identifier (e.g. IP hash or staff key)
 * @param limit - Maximum allowed requests within the window (default: 5)
 * @param windowMs - Sliding window duration in milliseconds (default: 10 minutes)
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000,
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  if (store.size > CLEANUP_THRESHOLD) {
    cleanupExpiredEntries(windowMs)
  }

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)

  if (entry.timestamps.length >= limit) {
    const oldestTimestamp = entry.timestamps[0]
    const resetMs = oldestTimestamp + windowMs
    const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - now) / 1000))

    return {
      success: false,
      limit,
      remaining: 0,
      resetMs,
      retryAfterSeconds,
    }
  }

  // Register this attempt
  entry.timestamps.push(now)

  const remaining = limit - entry.timestamps.length
  const oldestTimestamp = entry.timestamps[0]
  const resetMs = oldestTimestamp + windowMs
  const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - now) / 1000))

  return {
    success: true,
    limit,
    remaining,
    resetMs,
    retryAfterSeconds,
  }
}

/**
 * Resets rate limit for a specific key or clears entire store (primarily for testing).
 */
export function resetRateLimit(key?: string): void {
  if (key) {
    store.delete(key)
  } else {
    store.clear()
  }
}
