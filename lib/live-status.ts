/**
 * When the ticket page may ask the server whether it has been scanned —
 * DESIGN.md section 9, PR 3. Kept free of React and of the browser so the
 * rules can be unit-tested; components/ticket/LiveStatus.tsx applies them.
 *
 * The page only polls while a scan is plausible: from an hour before the
 * event starts until it ends, and only while the tab is actually on screen.
 * Outside that, a participant who opened the ticket days early costs the
 * server nothing.
 */

export const POLL_INTERVAL_MS = 5_000

/** How long before the event starts the desk is assumed to be open. */
export const POLL_LEAD_MS = 60 * 60 * 1000

export type PollingWindow = { start: Date; end: Date }

export function pollingWindow(event: { startsAt: Date; endsAt: Date }): PollingWindow {
  return { start: new Date(event.startsAt.getTime() - POLL_LEAD_MS), end: event.endsAt }
}

export function shouldPoll(
  window: PollingWindow,
  now: Date,
  visibility: DocumentVisibilityState,
): boolean {
  return visibility === 'visible' && now >= window.start && now <= window.end
}

/** The whole of the status endpoint's response. Nothing else is ever sent. */
export type TicketStatusResponse = { checkedIn: boolean }
