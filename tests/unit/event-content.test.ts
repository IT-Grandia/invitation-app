import { describe, expect, it } from 'vitest'

import { parseEventDetails, parseRundown } from '@/lib/validation/event-content'

describe('parseRundown', () => {
  it('keeps valid entries in the order they were written', () => {
    const raw = [
      { time: '08.00', activity: 'Registrasi ulang' },
      { time: '08.30', activity: 'Pemanasan bersama' },
    ]

    expect(parseRundown(raw)).toEqual(raw)
  })

  it('trims text and drops keys it does not know', () => {
    expect(parseRundown([{ time: ' 08.00 ', activity: ' Registrasi ulang ', note: 'x' }])).toEqual([
      { time: '08.00', activity: 'Registrasi ulang' },
    ])
  })

  it('leaves out entries that do not match and keeps the rest', () => {
    const raw = [
      { time: '08.00', activity: 'Registrasi ulang' },
      { time: 8, activity: 'Jam ditulis sebagai angka' },
      { time: '09.00' },
      { time: '10.00', activity: '   ' },
      null,
      'Makan siang',
      { time: '12.00', activity: 'Makan siang' },
    ]

    expect(parseRundown(raw)).toEqual([
      { time: '08.00', activity: 'Registrasi ulang' },
      { time: '12.00', activity: 'Makan siang' },
    ])
  })

  it.each([
    ['null', null],
    ['a single object', { time: '08.00', activity: 'Registrasi ulang' }],
    ['a JSON string', '[{"time":"08.00","activity":"Registrasi ulang"}]'],
  ])('returns an empty list for %s', (_label, raw) => {
    expect(parseRundown(raw)).toEqual([])
  })
})

describe('parseEventDetails', () => {
  it('keeps complete label and value pairs and leaves out the rest', () => {
    const raw = [
      { label: 'Dress code', value: 'Baju olahraga bebas' },
      { label: 'Bawa apa' },
      { label: '', value: 'Tanpa label' },
    ]

    expect(parseEventDetails(raw)).toEqual([{ label: 'Dress code', value: 'Baju olahraga bebas' }])
  })
})
