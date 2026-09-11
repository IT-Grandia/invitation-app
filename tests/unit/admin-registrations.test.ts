import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as getRegistrationsHandler } from '@/app/api/admin/registrations/route'

describe('GET /api/admin/registrations Auth & Data Hygiene', () => {
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
    const request = new Request('http://localhost/api/admin/registrations')
    const res = await getRegistrationsHandler(request)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
    expect(res.headers.get('cache-control')).toContain('no-store')
  })

  it('rejects request with invalid Bearer token with 401', async () => {
    const request = new Request('http://localhost/api/admin/registrations', {
      headers: {
        Authorization: 'Bearer wrong-key',
      },
    })
    const res = await getRegistrationsHandler(request)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
    expect(res.headers.get('cache-control')).toContain('no-store')
  })

  it('accepts valid Bearer token and returns response without exposing participant tokens', async () => {
    const request = new Request('http://localhost/api/admin/registrations?page=1&limit=10', {
      headers: {
        Authorization: `Bearer ${TEST_ADMIN_KEY}`,
      },
    })
    const res = await getRegistrationsHandler(request)

    expect(res.status).not.toBe(401)
    expect(res.headers.get('cache-control')).toContain('no-store')

    if (res.status === 200) {
      const json = await res.json()
      expect(json).toHaveProperty('items')
      expect(json).toHaveProperty('page')
      expect(json).toHaveProperty('limit')
      expect(json).toHaveProperty('total')
      expect(Array.isArray(json.items)).toBe(true)

      // CRITICAL SECURITY RULE: token MUST NEVER be in the admin registrations response
      for (const item of json.items) {
        expect(item).not.toHaveProperty('token')
        expect(item).toHaveProperty('ticketNumber')
        expect(item).toHaveProperty('fullName')
        expect(item).toHaveProperty('phone')
        expect(item).toHaveProperty('status')
      }
    }
  })
})
