import { createHash, timingSafeEqual } from 'node:crypto'

// Comparing digests rather than the raw strings keeps the comparison length
// constant, so neither the key nor its length leaks through response timing.
function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function verifyKey(provided: string | null | undefined, expected: string | undefined) {
  if (!provided || !expected) {
    return false
  }

  return timingSafeEqual(digest(provided), digest(expected))
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')

  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

export function isStaff(request: Request): boolean {
  return verifyKey(bearerToken(request), process.env.STAFF_KEY)
}

export function isAdmin(request: Request): boolean {
  return verifyKey(bearerToken(request), process.env.ADMIN_KEY)
}
