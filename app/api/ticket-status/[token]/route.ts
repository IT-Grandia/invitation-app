import { clientIpKey } from '@/lib/client-ip'
import { findRegistrationByToken } from '@/lib/db/queries/registrations'
import type { TicketStatusResponse } from '@/lib/live-status'
import { isWellFormedToken } from '@/lib/qr'
import { checkRateLimit } from '@/lib/rate-limit'

/** Same budget as /api/qr: 60 a minute per client; a page needs 12. */
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60 * 1000

/**
 * GET /api/ticket-status/[token] — has this ticket been scanned yet?
 *
 * Polled by the ticket page while a participant waits at the desk, so the
 * screen in their hand switches to "Checked In" a few seconds after the
 * scanner does (DESIGN.md section 6.4). The answer is one boolean: no name,
 * no time, nothing the ticket page does not already show to whoever holds
 * the URL.
 *
 * A malformed or unknown token gets a bare 404, exactly like the page itself,
 * so this endpoint reveals nothing the page would not.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!isWellFormedToken(token)) {
    return new Response(null, { status: 404 })
  }

  const limit = checkRateLimit(clientIpKey(request), RATE_LIMIT, RATE_WINDOW_MS)
  if (!limit.success) {
    return new Response(null, {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    })
  }

  const registration = await findRegistrationByToken(token)
  if (!registration) {
    return new Response(null, { status: 404 })
  }

  const body: TicketStatusResponse = { checkedIn: registration.checkedInAt !== null }

  return Response.json(body, {
    headers: {
      // Never cached: the whole point is the current answer.
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
