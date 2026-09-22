import type { NewEvent } from '../../lib/db/schema'

export const E2E_SLUG_PREFIX = 'e2e-'

/**
 * Starts years before any real or seeded event and ends decades later, so
 * getPublishedEvent always picks it and registration stays open whenever the
 * suite runs.
 */
export const E2E_EVENT = {
  name: 'E2E Padel Day',
  venueName: 'E2E Test Court',
  startsAt: new Date('1998-01-01T01:00:00.000Z'),
  endsAt: new Date('2099-12-31T10:00:00.000Z'),
  registrationOpensAt: new Date('1997-12-01T00:00:00.000Z'),
  registrationClosesAt: new Date('2099-12-31T00:00:00.000Z'),
  status: 'published',
  contactWhatsapp: '628123456789',
} satisfies Omit<NewEvent, 'slug'>
