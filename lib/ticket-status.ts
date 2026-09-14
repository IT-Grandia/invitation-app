import type { Registration } from '@/lib/db/schema'

/**
 * What the ticket page shows for a registration — DESIGN.md section 6.3. The
 * five states decide the headline, whether the QR is shown, spent, or hidden,
 * and which buttons appear.
 */
export type TicketStatus =
  | { kind: 'registered' }
  | { kind: 'checked_in'; at: Date }
  | { kind: 'not_attending' }
  | { kind: 'cancelled' }
  | { kind: 'waitlist' }

/**
 * Precedence matters. A cancelled registration that somehow carries a
 * check-in timestamp must still read as cancelled, never as attended. And a
 * participant who answered "not attending" on the form but turned up anyway
 * is admitted (lib/db/schema.ts), so a check-in outranks that answer.
 */
export function resolveTicketStatus(
  registration: Pick<Registration, 'status' | 'checkedInAt' | 'attending'>,
): TicketStatus {
  if (registration.status === 'cancelled') {
    return { kind: 'cancelled' }
  }

  if (registration.status === 'waitlist') {
    return { kind: 'waitlist' }
  }

  if (registration.checkedInAt) {
    return { kind: 'checked_in', at: registration.checkedInAt }
  }

  if (!registration.attending) {
    return { kind: 'not_attending' }
  }

  return { kind: 'registered' }
}

/** Whether the QR is usable at the gate. Only a confirmed, unused ticket is. */
export function qrPresentation(status: TicketStatus): 'live' | 'spent' | 'hidden' {
  switch (status.kind) {
    case 'registered':
      return 'live'
    case 'checked_in':
      return 'spent'
    case 'not_attending':
    case 'cancelled':
    case 'waitlist':
      return 'hidden'
  }
}
