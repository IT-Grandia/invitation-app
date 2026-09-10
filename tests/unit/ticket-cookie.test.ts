import { describe, expect, it } from 'vitest'

import {
  buildClearTicketCookieHeader,
  buildTicketCookieHeader,
  TICKET_COOKIE_MAX_AGE,
  TICKET_COOKIE_NAME,
} from '@/lib/ticket-cookie'

describe('Ticket Cookie Utilities', () => {
  it('exports correct cookie name and max age constants', () => {
    expect(TICKET_COOKIE_NAME).toBe('padel_ticket')
    expect(TICKET_COOKIE_MAX_AGE).toBe(4838400) // 56 days
  })

  it('builds ticket cookie header with all required security attributes', () => {
    const token = 'abcdef1234567890abcdef12'
    const header = buildTicketCookieHeader(token)

    expect(header).toContain('padel_ticket=abcdef1234567890abcdef12')
    expect(header).toContain('HttpOnly')
    expect(header).toContain('Secure')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
    expect(header).toContain('Max-Age=4838400')
  })

  it('builds clear cookie header with Max-Age=0 and security attributes', () => {
    const header = buildClearTicketCookieHeader()

    expect(header).toMatch(/^padel_ticket=;/)
    expect(header).toMatch(/padel_ticket=;.*Max-Age=0/i)
    expect(header).toContain('HttpOnly')
    expect(header).toContain('Secure')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
  })
})
