import type { Event } from '@/lib/db/schema'

/**
 * What the call to action on the invitation should say, derived from the
 * event row and the current head count — the state table in
 * docs/05-UX-FLOWS.md section 4.1, minus "already has a ticket", which the
 * page decides from the cookie.
 */
export type RegistrationState =
  | { kind: 'open'; remaining: number | null }
  | { kind: 'not_open_yet'; opensAt: Date }
  | { kind: 'closed' }
  | { kind: 'full' }
  | { kind: 'past' }

type EventWindow = Pick<
  Event,
  'status' | 'endsAt' | 'registrationOpensAt' | 'registrationClosesAt' | 'capacity'
>

/**
 * Precedence, most final first: an event that is over is over no matter what
 * the registration columns say; a committee that closed registration early
 * (status = closed, PRD A-05) beats the date window; the window beats the
 * quota; and only an open window with a free seat is "open".
 *
 * The count shown here is for display only. The server re-checks capacity
 * inside the registration transaction — docs/06-SECURITY.md A9.
 */
export function resolveRegistrationState(
  event: EventWindow,
  registered: number,
  now: Date = new Date(),
): RegistrationState {
  if (now > event.endsAt) {
    return { kind: 'past' }
  }

  if (event.status === 'closed') {
    return { kind: 'closed' }
  }

  if (now < event.registrationOpensAt) {
    return { kind: 'not_open_yet', opensAt: event.registrationOpensAt }
  }

  if (now > event.registrationClosesAt) {
    return { kind: 'closed' }
  }

  // Same arithmetic as remainingCapacity() in lib/db/queries/event.ts, kept
  // inline so this module stays free of the database client and unit-testable
  // without one.
  const remaining = event.capacity === null ? null : Math.max(event.capacity - registered, 0)
  if (remaining !== null && remaining <= 0) {
    return { kind: 'full' }
  }

  return { kind: 'open', remaining }
}
