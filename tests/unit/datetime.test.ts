import { describe, expect, it } from 'vitest'

import {
  formatWib,
  formatWibDate,
  formatWibDateLong,
  formatWibTime,
  isWithin,
} from '@/lib/datetime'

// 26 September 2026, 08:00 WIB
const EVENT_START = '2026-09-26T01:00:00.000Z'

describe('WIB formatting', () => {
  it('renders a UTC timestamp in Jakarta time', () => {
    expect(formatWib(EVENT_START)).toBe('26 Sep 2026, 08:00')
  })

  it('accepts a Date as well as an ISO string', () => {
    expect(formatWib(new Date(EVENT_START))).toBe(formatWib(EVENT_START))
  })

  it('renders the long date in Indonesian', () => {
    expect(formatWibDateLong(EVENT_START)).toBe('Sabtu, 26 September 2026')
  })

  // Participant pages are in English; the default stays Indonesian so staff,
  // admin and spreadsheet output do not change.
  it('renders in English when asked, without changing the default', () => {
    expect(formatWibDateLong(EVENT_START, 'en')).toBe('Saturday, 26 September 2026')
    expect(formatWib(EVENT_START, 'en')).toBe('26 Sep 2026, 08:00')
    expect(formatWibDate(EVENT_START, 'en')).toBe('26 Sep 2026')
    expect(formatWibDateLong(EVENT_START, 'id')).toBe(formatWibDateLong(EVENT_START))
  })

  it('renders date and time separately', () => {
    expect(formatWibDate(EVENT_START)).toBe('26 Sep 2026')
    expect(formatWibTime(EVENT_START)).toBe('08:00')
  })

  it('shifts a UTC day boundary into the previous Jakarta day', () => {
    // 23:00 WIB on the 25th is 16:00 UTC, still the 25th locally.
    expect(formatWib('2026-09-25T16:00:00.000Z')).toBe('25 Sep 2026, 23:00')
  })

  it('rolls over to the next Jakarta day past 17:00 UTC', () => {
    expect(formatWib('2026-09-25T17:00:00.000Z')).toBe('26 Sep 2026, 00:00')
  })
})

describe('isWithin', () => {
  const opens = new Date('2026-09-09T00:00:00.000Z')
  const closes = new Date('2026-09-25T14:00:00.000Z')

  it.each([
    ['2026-09-08T23:59:59.000Z', false],
    ['2026-09-09T00:00:00.000Z', true],
    ['2026-09-15T12:00:00.000Z', true],
    ['2026-09-25T14:00:00.000Z', true],
    ['2026-09-25T14:00:01.000Z', false],
  ])('at %s returns %s', (now, expected) => {
    expect(isWithin(opens, closes, new Date(now))).toBe(expected)
  })
})
