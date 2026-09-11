import { createHash } from 'node:crypto'

import { isWellFormedToken, renderTicketQr } from '@/lib/qr'
import { checkRateLimit } from '@/lib/rate-limit'
import { ticketNumber } from '@/lib/token'

/** docs/04-API-SPEC.md section 1: 60 requests per minute, keyed by IP hash. */
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60 * 1000

// Same derivation as app/api/register/route.ts so one client is one key
// across both endpoints. Worth lifting into a shared helper once a third
// route needs it.
function hashClientIp(ip: string): string {
  const salt = process.env.IP_SALT ?? 'grandia-padel-salt'
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
}

/**
 * GET /api/qr/[token] — the ticket QR as a PNG.
 *
 * No database lookup on purpose (docs/04-API-SPEC.md section 3): the image
 * carries no secret, only the ticket URL, and the page behind that URL is what
 * gates access. Checking the database here would turn this endpoint into a
 * fast oracle for probing which tokens exist. A malformed token gets a bare
 * 404 with no body for the same reason.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!isWellFormedToken(token)) {
    return new Response(null, { status: 404 })
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  const limit = checkRateLimit(hashClientIp(clientIp), RATE_LIMIT, RATE_WINDOW_MS)

  if (!limit.success) {
    return new Response(null, {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    })
  }

  const png = await renderTicketQr(token)

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.byteLength),
      // The image for a given token never changes, so it can live in the CDN
      // for as long as the browser cares to keep it.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="tiket-padel-${ticketNumber(token)}.png"`,
    },
  })
}
