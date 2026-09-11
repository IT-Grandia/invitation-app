import QRCode from 'qrcode'

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
 * Read at call time rather than module load so a test can set the variable.
 * The localhost fallback matches app/layout.tsx; the real value must point at
 * the final domain before the first participant registers, because a QR that
 * has already been issued cannot be reissued (docs/01-PRD.md section 10.1).
 */
export function ticketUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  return `${base}/t/${token}`
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
