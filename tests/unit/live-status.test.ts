import { describe, expect, it } from 'vitest'

import { POLL_INTERVAL_MS, shouldPoll } from '@/lib/live-status'

describe('shouldPoll', () => {
  it('polls only while the page is on screen', () => {
    expect(shouldPoll('visible')).toBe(true)
    expect(shouldPoll('hidden')).toBe(false)
  })
})

describe('POLL_INTERVAL_MS', () => {
  it('asks a few times a minute, not a few times a second', () => {
    expect(POLL_INTERVAL_MS).toBeGreaterThanOrEqual(3_000)
    expect(POLL_INTERVAL_MS).toBeLessThanOrEqual(10_000)
  })
})
