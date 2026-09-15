import { describe, expect, it } from 'vitest'

import { BRAND, VENUE_LOGO, venueLogoFor } from '@/lib/brand'

describe('venueLogoFor', () => {
  it('matches the venue by name, ignoring case and stray spaces', () => {
    expect(venueLogoFor('Padel Ground')).toBe(VENUE_LOGO)
    expect(venueLogoFor('  padel ground ')).toBe(VENUE_LOGO)
  })

  // The database decides where the event is; a different venue must fall
  // back to its name rather than borrow this logo.
  it('returns null for any other venue', () => {
    expect(venueLogoFor('Folkafe Siranda, Semarang')).toBeNull()
    expect(venueLogoFor('TBA')).toBeNull()
  })
})

describe('BRAND', () => {
  it('spells the brand lines as the organiser wrote them', () => {
    expect(BRAND.lockup).toBe('Grandia × Folkafe')
    expect(BRAND.headline).toBe('Padel, Coffee, & Business Networking')
    expect(BRAND.tagline).toBe('Play. Connect. Build.')
    expect(BRAND.sponsors.map((sponsor) => sponsor.name)).toEqual(['Grandia', 'Folkafe', 'Padel79'])
  })
})
