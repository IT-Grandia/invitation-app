export const TICKET_COOKIE_NAME = 'padel_ticket'
export const TICKET_COOKIE_MAX_AGE = 4838400 // 56 days (until retention purge)

/**
 * Builds the Set-Cookie header value to store the participant's ticket token.
 * Uses HttpOnly, Secure, SameSite=Lax, Path=/ and Max-Age=4838400.
 *
 * SameSite=Lax is critical so the cookie is sent when opening links from WhatsApp (ADR-0006).
 */
export function buildTicketCookieHeader(token: string): string {
  return `${TICKET_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TICKET_COOKIE_MAX_AGE}`
}

/**
 * Builds the Set-Cookie header value to clear the ticket cookie from the device.
 * Sets Max-Age=0 to tell the browser to immediately discard the cookie (04-API-SPEC.md §3.1).
 */
export function buildClearTicketCookieHeader(): string {
  return `${TICKET_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}
