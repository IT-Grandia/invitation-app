import { describe, expect, it } from 'vitest'

import { POLL_LEAD_MS, pollingWindow, shouldPoll } from '@/lib/live-status'

// 26 September 2026, 16:00–20:00 WIB
const event = {
  startsAt: new Date('2026-09-26T09:00:00.000Z'),
  endsAt: new Date('2026-09-26T13:00:00.000Z'),
}

describe('pollingWindow', () => {
  it('opens an hour before the event and closes when it ends', () => {
    const window = pollingWindow(event)

    expect(window.start.getTime()).toBe(event.startsAt.getTime() - POLL_LEAD_MS)
    expect(window.start.toISOString()).toBe('2026-09-26T08:00:00.000Z')
    expect(window.end).toEqual(event.endsAt)
  })
})

describe('shouldPoll', () => {
  const window = pollingWindow(event)

  it.each([
    ['days before the event', '2026-09-20T10:00:00.000Z', false],
    ['a minute before the window opens', '2026-09-26T07:59:00.000Z', false],
    ['as the window opens', '2026-09-26T08:00:00.000Z', true],
    ['at the registration desk', '2026-09-26T09:05:00.000Z', true],
    ['as the event ends', '2026-09-26T13:00:00.000Z', true],
    ['after the event', '2026-09-26T13:00:01.000Z', false],
  ])('%s → %s', (_label, now, expected) => {
    expect(shouldPoll(window, new Date(now), 'visible')).toBe(expected)
  })

  it('never polls while the tab is hidden, even inside the window', () => {
    expect(shouldPoll(window, new Date('2026-09-26T09:05:00.000Z'), 'hidden')).toBe(false)
  })
})
