import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/ticket-status/[token]/route'
import { POLL_INTERVAL_MS, TICKET_STATUS_RATE_LIMIT } from '@/lib/live-status'
import { resetRateLimit } from '@/lib/rate-limit'

// The route's only database call. Rows are faked per test; nothing here
// touches Postgres.
const findRegistrationByToken = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db/queries/registrations', () => ({ findRegistrationByToken }))

const TOKEN_A = 'A'.repeat(24)
const TOKEN_B = 'B'.repeat(24)

function get(token: string, ip = '203.0.113.10') {
  return GET(
    new Request(`http://localhost/api/ticket-status/${token}`, {
      headers: { 'x-forwarded-for': ip },
    }),
    { params: Promise.resolve({ token }) },
  )
}

beforeEach(() => {
  resetRateLimit()
  findRegistrationByToken.mockReset()
  findRegistrationByToken.mockImplementation(async (token: string) =>
    token === TOKEN_A || token === TOKEN_B ? { token, checkedInAt: null } : null,
  )
})

afterEach(() => {
  resetRateLimit()
})

describe('GET /api/ticket-status/[token]', () => {
  it('answers with the one boolean and no caching', async () => {
    findRegistrationByToken.mockResolvedValueOnce({ token: TOKEN_A, checkedInAt: new Date() })

    const response = await get(TOKEN_A)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ checkedIn: true })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
  })

  it('gives a bare 404 for a malformed token without asking the database', async () => {
    const response = await get('not-a-token')

    expect(response.status).toBe(404)
    expect(findRegistrationByToken).not.toHaveBeenCalled()
  })

  it('gives the same bare 404 for an unknown token', async () => {
    const response = await get('C'.repeat(24))

    expect(response.status).toBe(404)
  })

  // The venue scenario: every phone behind one router shares a public IP.
  // Each ticket must keep its own budget, or the fifth phone in the queue
  // would silently never see "Checked In".
  it('budgets per ticket, so phones behind one IP do not starve each other', async () => {
    const { perToken } = TICKET_STATUS_RATE_LIMIT

    for (let i = 0; i < perToken; i++) {
      expect((await get(TOKEN_A)).status).toBe(200)
    }

    const refused = await get(TOKEN_A)
    expect(refused.status).toBe(429)
    expect(Number(refused.headers.get('Retry-After'))).toBeGreaterThan(0)

    // Another ticket from the same IP is untouched.
    expect((await get(TOKEN_B)).status).toBe(200)
  })

  it('leaves a page polling at the normal cadence well inside its budget', () => {
    const pollsPerWindow = TICKET_STATUS_RATE_LIMIT.windowMs / POLL_INTERVAL_MS
    // Room for a second tab and the extra check on returning to the tab.
    expect(TICKET_STATUS_RATE_LIMIT.perToken).toBeGreaterThanOrEqual(pollsPerWindow * 2)
    // The IP ceiling has to cover a hall of phones polling behind one router.
    expect(TICKET_STATUS_RATE_LIMIT.perIp).toBeGreaterThanOrEqual(pollsPerWindow * 100)
  })
})
