import QRCode from 'qrcode'

import { isSiteUrlConfigured, siteUrl } from '@/lib/site-url'
import { TOKEN_LENGTH } from '@/lib/token'

/**
 * Exactly one nanoid token: the URL-safe alphabet at the fixed length. Anything
 * else is refused before it reaches the encoder, so /api/qr cannot be used to
 * render arbitrary strings into QR images.
 */
const TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${TOKEN_LENGTH}}$`)

export function isWellFormedToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

/**
 * The string the QR encodes. This is the contract with the scanner
 * (docs/11-JOBDESK.md section 5): the full ticket URL, nothing else.
 *
 * In production this refuses to run without NEXT_PUBLIC_SITE_URL. A blank
 * variable would otherwise put localhost inside every QR — silently, since
 * the image still renders and scans — and a QR that has been saved to a
 * participant's photos cannot be reissued (docs/01-PRD.md section 10.1). A
 * broken image on the ticket page is noticed in the post-deploy check within
 * minutes; a wrong host is noticed at the gate on event day.
 */
export function ticketUrl(token: string): string {
  if (process.env.NODE_ENV === 'production' && !isSiteUrlConfigured()) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL is not set. Refusing to issue a ticket URL that would point at localhost.',
    )
  }

  return `${siteUrl()}/t/${token}`
}

/**
 * Renders the ticket QR as a PNG buffer to the spec in docs/04-API-SPEC.md
 * section 3 and docs/team/DEV-B.md rule B-2:
 *
 *   800 x 800 px · quiet zone of 2 modules · error correction M
 *   pure black on pure white, no styling of any kind
 *
 * The rules exist because the image has to survive a 30% screen, a screenshot,
 * and a photo of another phone's screen. Every decoration trades readability
 * for nothing that matters at the gate.
 */
export function renderTicketQr(token: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketUrl(token), {
    type: 'png',
    width: 800,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  })
}
