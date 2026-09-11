import { describe, expect, it } from 'vitest'

import { buildIcs } from '@/lib/ics'

const base = {
  uid: 'evt-1@padel.example.com',
  summary: 'Padel Day 2026',
  startsAt: new Date('2026-09-26T01:00:00.000Z'), // 08:00 WIB
  endsAt: new Date('2026-09-26T10:00:00.000Z'), // 17:00 WIB
}
const stamp = new Date('2026-09-11T05:00:00.000Z')

describe('buildIcs', () => {
  it('emits the event window in UTC so every calendar app lands on 08:00 WIB', () => {
    const ics = buildIcs(base, stamp)

    expect(ics).toContain('DTSTART:20260926T010000Z')
    expect(ics).toContain('DTEND:20260926T100000Z')
    expect(ics).toContain('DTSTAMP:20260911T050000Z')
  })

  it('terminates every line with CRLF, including the last one', () => {
    const ics = buildIcs(base, stamp)

    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).not.toMatch(/[^\r]\n/)
  })

  it('escapes commas, semicolons and newlines in text fields', () => {
    const ics = buildIcs(
      { ...base, location: 'Padel Arena, Jakarta; Selatan', description: 'Baris satu\nBaris dua' },
      stamp,
    )

    expect(ics).toContain('LOCATION:Padel Arena\\, Jakarta\\; Selatan')
    expect(ics).toContain('DESCRIPTION:Baris satu\\nBaris dua')
  })

  it('folds lines longer than 75 octets onto a continuation line', () => {
    const ics = buildIcs({ ...base, description: 'x'.repeat(120) }, stamp)
    const folded = ics.split('\r\n').filter((line) => line.startsWith('DESCRIPTION') || line.startsWith(' '))

    expect(folded.length).toBeGreaterThan(1)
    expect(folded[1]?.startsWith(' ')).toBe(true)
    for (const line of ics.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75)
    }
  })

  it('omits optional fields that are missing', () => {
    const ics = buildIcs(base, stamp)

    expect(ics).not.toContain('LOCATION:')
    expect(ics).not.toContain('DESCRIPTION:')
    expect(ics).not.toContain('URL:')
  })
})
