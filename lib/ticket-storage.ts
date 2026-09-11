import { TOKEN_LENGTH } from '@/lib/token'

/**
 * The localStorage layer of ticket persistence — docs/02-ARCHITECTURE.md
 * section 4.1. The HttpOnly cookie is the primary layer and is read on the
 * server; this one is read in the browser after hydration and covers the case
 * where the cookie is gone but site data survived (or the other way round).
 *
 * Contract for Dev A: call `storeTicket(token)` in the registration form's
 * success handler, right before redirecting to /t/<token>. Nothing else
 * should ever write this key — in particular the ticket page must not, or
 * opening a friend's link would store the friend's ticket on this phone.
 *
 * Client-safe: no server-only imports. Every call is wrapped because
 * localStorage throws in private mode and when site data is blocked.
 */

export const TICKET_STORAGE_KEY = 'padel_ticket'

// Mirrors isWellFormedToken in lib/qr.ts, which cannot be imported here
// without dragging the qrcode encoder into the client bundle.
const TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${TOKEN_LENGTH}}$`)

export function readStoredTicket(): string | null {
  try {
    const value = window.localStorage.getItem(TICKET_STORAGE_KEY)
    return value && TOKEN_PATTERN.test(value) ? value : null
  } catch {
    return null
  }
}

export function storeTicket(token: string): void {
  try {
    window.localStorage.setItem(TICKET_STORAGE_KEY, token)
  } catch {
    // Nothing to do: the cookie layer still holds.
  }
}

export function clearStoredTicket(): void {
  try {
    window.localStorage.removeItem(TICKET_STORAGE_KEY)
  } catch {
    // Already unreadable, so effectively cleared.
  }
}
