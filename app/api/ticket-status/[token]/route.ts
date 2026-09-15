import { clientIpKey } from '@/lib/client-ip'
import { findRegistrationByToken } from '@/lib/db/queries/registrations'
import { TICKET_STATUS_RATE_LIMIT, type TicketStatusResponse } from '@/lib/live-status'
import { isWellFormedToken } from '@/lib/qr'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/ticket-status/[token] — has this ticket been scanned yet?
 *
 * Polled by the ticket page while a participant waits at the desk, so the
 * screen in their hand switches to "Checked In" a few seconds after the
 * scanner does (DESIGN.md section 5.4). The answer is one boolean: no name,
 * no time, nothing the ticket page does not already show to whoever holds
 * the URL.
 *
 * Rate limited per ticket first, per client second. At the venue every phone
 * sits behind the same router and shares one public IP, so a per-IP budget
 * alone would run out after a handful of phones and the rest would silently
 * never see "Checked In". Per ticket, each phone has its own allowance and
 * the IP layer only caps a client spraying random tokens.
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

  const { windowMs, perToken, perIp } = TICKET_STATUS_RATE_LIMIT
  const byToken = checkRateLimit(`ticket-status:${token}`, perToken, windowMs)
  const byIp = checkRateLimit(clientIpKey(request, 'ticket-status'), perIp, windowMs)
  const refused = [byToken, byIp].find((result) => !result.success)

  if (refused) {
    return new Response(null, {
      status: 429,
      headers: { 'Retry-After': String(refused.retryAfterSeconds) },
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
