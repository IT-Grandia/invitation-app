import type { Registration } from '@/lib/db/schema'

/**
 * What the ticket page shows for a registration. The four states come from
 * docs/05-UX-FLOWS.md section 4.3 and decide the badge, whether the QR is
 * shown, dimmed, or hidden, and the wording around it.
 */
export type TicketStatus =
  | { kind: 'registered' }
  | { kind: 'checked_in'; at: Date }
  | { kind: 'cancelled' }
  | { kind: 'waitlist' }

/**
 * Precedence matters: a cancelled registration that somehow carries a
 * check-in timestamp must still read as cancelled, never as attended.
 */
export function resolveTicketStatus(
  registration: Pick<Registration, 'status' | 'checkedInAt'>,
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

  return { kind: 'registered' }
}

/** Whether the QR is usable at the gate. Only a confirmed, unused ticket is. */
export function qrPresentation(status: TicketStatus): 'live' | 'spent' | 'hidden' {
  switch (status.kind) {
    case 'registered':
      return 'live'
    case 'checked_in':
      return 'spent'
    case 'cancelled':
    case 'waitlist':
      return 'hidden'
  }
}
