/**
 * When the ticket page may ask the server whether it has been scanned —
 * DESIGN.md section 5.3. Kept free of React and of the browser so the rules
 * can be unit-tested; components/ticket/LiveStatus.tsx applies them.
 *
 * The page polls whenever it is actually on screen and the ticket is still
 * live. There is deliberately no "only around the event" window: a window
 * derived from the event's dates would stop the feature silently if the
 * committee's date were wrong or the desk opened early, and the saving is
 * negligible for an event of this size — a phone that is locked or switched
 * away is hidden, and a hidden page never polls.
 */

export const POLL_INTERVAL_MS = 5_000

export function shouldPoll(visibility: DocumentVisibilityState): boolean {
  return visibility === 'visible'
}

/** The whole of the status endpoint's response. Nothing else is ever sent. */
export type TicketStatusResponse = { checkedIn: boolean }

/**
 * Budgets for GET /api/ticket-status, per minute.
 *
 * The first key is the ticket itself: one ticket, one budget, so a hall full
 * of phones behind one venue router (one public IP) never share a quota. A
 * page asks 12 times a minute; the allowance leaves room for a second tab and
 * the extra check on returning to the tab. The IP layer is only a ceiling
 * against one client spraying made-up tokens, and is sized for every phone
 * at the venue polling at once behind that single address.
 */
export const TICKET_STATUS_RATE_LIMIT = {
  windowMs: 60_000,
  perToken: 30,
  perIp: 1_200,
} as const
