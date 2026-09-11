import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as getStatsHandler } from '@/app/api/admin/stats/route'

describe('GET /api/admin/stats Auth & Route Handling', () => {
  const originalAdminKey = process.env.ADMIN_KEY
  const TEST_ADMIN_KEY = 'test-admin-secret-key-12345'

  beforeEach(() => {
    process.env.ADMIN_KEY = TEST_ADMIN_KEY
  })

  afterEach(() => {
    process.env.ADMIN_KEY = originalAdminKey
    vi.restoreAllMocks()
  })

  it('rejects request without Authorization header with 401', async () => {
    const request = new Request('http://localhost/api/admin/stats')
    const res = await getStatsHandler(request)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
    expect(res.headers.get('cache-control')).toContain('no-store')
  })

  it('rejects request with invalid Bearer token with 401', async () => {
    const request = new Request('http://localhost/api/admin/stats', {
      headers: {
        Authorization: 'Bearer wrong-key',
      },
    })
    const res = await getStatsHandler(request)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
    expect(res.headers.get('cache-control')).toContain('no-store')
  })

  it('accepts valid Bearer token and returns stats structure or not-found with no-store header', async () => {
    const request = new Request('http://localhost/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${TEST_ADMIN_KEY}`,
      },
    })
    const res = await getStatsHandler(request)

    expect(res.status).not.toBe(401)
    expect(res.headers.get('cache-control')).toContain('no-store')

    if (res.status === 200) {
      const json = await res.json()
      expect(json).toHaveProperty('event')
      expect(json).toHaveProperty('totals')
      expect(json).toHaveProperty('sheetSync')
      expect(json.totals).toHaveProperty('registered')
      expect(json.totals).toHaveProperty('checkedIn')
      expect(json).toHaveProperty('lastCheckIn')
    }
  })
})
