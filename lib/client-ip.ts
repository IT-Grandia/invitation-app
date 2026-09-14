import { createHash } from 'node:crypto'

/**
 * The rate-limit key for a request: a salted hash of the client IP, so the
 * limiter never holds a raw address (docs/06-SECURITY.md). Same derivation as
 * app/api/register/route.ts, so one client is one key across every endpoint.
 */
export function clientIpKey(request: Request): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  const salt = process.env.IP_SALT ?? 'grandia-padel-salt'
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
}
