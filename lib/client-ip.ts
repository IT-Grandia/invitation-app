import { createHash } from 'node:crypto'

/**
 * A per-client rate-limit key: a salted hash of the client IP, so the limiter
 * never holds a raw address (docs/06-SECURITY.md). Same derivation as
 * app/api/register/route.ts.
 *
 * `scope` keeps each endpoint's counter separate. The limiter stores one
 * sliding window per key, so two routes sharing a bare hash would also share
 * a budget — a burst of QR loads would then eat into a stricter limit
 * elsewhere.
 */
export function clientIpKey(request: Request, scope: string): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  const salt = process.env.IP_SALT ?? 'grandia-padel-salt'
  const hash = createHash('sha256').update(`${ip}:${salt}`).digest('hex')
  return `ip:${scope}:${hash}`
}
