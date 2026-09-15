import { clientIpKey } from '@/lib/client-ip'
import { isWellFormedToken, renderTicketQr } from '@/lib/qr'
import { checkRateLimit } from '@/lib/rate-limit'
import { ticketNumber } from '@/lib/token'

/**
 * docs/04-API-SPEC.md section 1. Per ticket first: a page loads the image
 * once and the save button fetches it once more, and browsers and the CDN
 * cache it after that. Per client second, as a ceiling only — at the venue
 * every phone shares the router's public IP, so this number has to cover a
 * whole hall opening their tickets in the same minute.
 */
const RATE_WINDOW_MS = 60 * 1000
const PER_TOKEN_LIMIT = 20
const PER_IP_LIMIT = 600

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

  const perToken = checkRateLimit(`qr:${token}`, PER_TOKEN_LIMIT, RATE_WINDOW_MS)
  const perIp = checkRateLimit(clientIpKey(request, 'qr'), PER_IP_LIMIT, RATE_WINDOW_MS)
  const refused = [perToken, perIp].find((result) => !result.success)

  if (refused) {
    return new Response(null, {
      status: 429,
      headers: { 'Retry-After': String(refused.retryAfterSeconds) },
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
