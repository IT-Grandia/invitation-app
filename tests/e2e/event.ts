import type { NewEvent } from '../../lib/db/schema'

export const E2E_SLUG_PREFIX = 'e2e-'

/** The committee's note, as events.details carries it in production. */
export const E2E_NOTE = {
  label: 'Women guests',
  value: 'Please arrive at 15:30 sharp for hairdo by Liekuang & Co.',
}

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
  details: [E2E_NOTE],
} satisfies Omit<NewEvent, 'slug'>
