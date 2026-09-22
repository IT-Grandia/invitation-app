import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BRAND, VENUE_LOGO, venueLogoFor } from '@/lib/brand'

describe('venueLogoFor', () => {
  it('matches the venue by name, ignoring case and stray spaces', () => {
    expect(venueLogoFor('Padel Ground')).toBe(VENUE_LOGO)
    expect(venueLogoFor('  padel  ground ')).toBe(VENUE_LOGO)
  })

  // The committee appends the city or a note after the name — production
  // reads "Padel Ground, Semarang" — and the logo must still show.
  it('matches when the name is followed by a city or a note', () => {
    expect(venueLogoFor('Padel Ground, Semarang')).toBe(VENUE_LOGO)
    expect(venueLogoFor('PADEL GROUND (Siranda)')).toBe(VENUE_LOGO)
    expect(venueLogoFor('Padel Ground - Jl. Siranda')).toBe(VENUE_LOGO)
  })

  // The database decides where the event is; a different venue must fall
  // back to its name rather than borrow this logo.
  it('returns null for any other venue, including near-misses', () => {
    expect(venueLogoFor('Folkafe Siranda, Semarang')).toBeNull()
    expect(venueLogoFor('TBA')).toBeNull()
    expect(venueLogoFor('Padel Grounds')).toBeNull()
    expect(venueLogoFor('Old Padel Ground')).toBeNull()
  })
})

/** Width and height from a WebP header: lossy (VP8), lossless (VP8L) or extended (VP8X). */
function webpSize(path: string) {
  const file = readFileSync(join(process.cwd(), 'public', path))
  const chunk = file.toString('ascii', 12, 16)

  if (chunk === 'VP8X') {
    return { width: file.readUIntLE(24, 3) + 1, height: file.readUIntLE(27, 3) + 1 }
  }
  if (chunk === 'VP8 ') {
    return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    const bits = file.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  throw new Error(`${path} is not a WebP file`)
}

describe('BRAND', () => {
  it('names the presenter as the flyer does', () => {
    expect(BRAND.presenter).toBe('The Grandia Group')
    expect(BRAND.presents).toBe('Presents')
  })

  // next/image reserves space from these numbers. When the organiser sends a
  // new file, a size left stale would stretch the artwork.
  it('records the real size of every brand image', () => {
    for (const image of [BRAND.flyer, BRAND.sponsors.supported, BRAND.sponsors.community]) {
      expect(webpSize(image.src), image.src).toEqual({ width: image.width, height: image.height })
    }
  })
})
