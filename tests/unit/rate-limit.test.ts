import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'

describe('Rate Limit Utility (lib/rate-limit.ts)', () => {
  beforeEach(() => {
    resetRateLimit()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetRateLimit()
  })

  it('allows requests within limit and decrements remaining counter', () => {
    const key = 'test-ip-hash-1'

    for (let i = 1; i <= 5; i++) {
      const res = checkRateLimit(key, 5, 600_000)
      expect(res.success).toBe(true)
      expect(res.remaining).toBe(5 - i)
      expect(res.limit).toBe(5)
    }
  })

  it('blocks request exceeding the limit and returns positive retryAfterSeconds', () => {
    const key = 'test-ip-hash-2'

    // Consume all 5 quota
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 600_000)
    }

    // 6th attempt should be blocked
    const blocked = checkRateLimit(key, 5, 600_000)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(600)
  })

  it('isolates rate limits between different keys', () => {
    const keyA = 'ip-hash-a'
    const keyB = 'ip-hash-b'

    // Consume all quota for keyA
    for (let i = 0; i < 5; i++) {
      checkRateLimit(keyA, 5, 600_000)
    }
    expect(checkRateLimit(keyA, 5, 600_000).success).toBe(false)

    // keyB should still have full quota
    const resB = checkRateLimit(keyB, 5, 600_000)
    expect(resB.success).toBe(true)
    expect(resB.remaining).toBe(4)
  })

  it('allows requests again after sliding window expires', () => {
    const key = 'test-ip-hash-expiry'
    const windowMs = 60_000 // 1 minute window for test

    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, windowMs)
    }
    expect(checkRateLimit(key, 3, windowMs).success).toBe(false)

    // Advance time past the window
    vi.advanceTimersByTime(windowMs + 1000)

    // Should be allowed again
    const res = checkRateLimit(key, 3, windowMs)
    expect(res.success).toBe(true)
    expect(res.remaining).toBe(2)
  })

  it('allows resetting limit for a specific key', () => {
    const key = 'test-ip-hash-reset'
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 600_000)
    }
    expect(checkRateLimit(key, 5, 600_000).success).toBe(false)

    resetRateLimit(key)

    const res = checkRateLimit(key, 5, 600_000)
    expect(res.success).toBe(true)
    expect(res.remaining).toBe(4)
  })
})
