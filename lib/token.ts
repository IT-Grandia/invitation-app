import { nanoid } from 'nanoid'

export const TOKEN_LENGTH = 24

// The token is the participant's only credential, so it is generated server side
// from a CSPRNG. nanoid's default alphabet is the 64 URL-safe characters, which
// puts 24 characters at roughly 143 bits of entropy.
export function generateToken(): string {
  return nanoid(TOKEN_LENGTH)
}

/**
 * Accepts either a full ticket URL, as encoded in the QR code, or a bare token
 * typed into manual search. Returns null when the input contains neither.
 */
export function extractToken(input: string): string | null {
  const trimmed = input.trim()

  if (!trimmed) {
    return null
  }

  const fromUrl = trimmed.match(/\/t\/([A-Za-z0-9_-]+)/)
  if (fromUrl) {
    return fromUrl[1]
  }

  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null
}

/** Short human-readable reference shown on the ticket and in the spreadsheet. */
export function ticketNumber(token: string): string {
  return token.slice(0, 8).toUpperCase()
}
