import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PATCH as patchRegistrationHandler } from '@/app/api/admin/registrations/[id]/route'

describe('PATCH /api/admin/registrations/[id] Auth & Validation', () => {
  const originalAdminKey = process.env.ADMIN_KEY
  const TEST_ADMIN_KEY = 'test-admin-secret-key-12345'
  const FAKE_ID = '00000000-0000-0000-0000-000000000000'

  beforeEach(() => {
    process.env.ADMIN_KEY = TEST_ADMIN_KEY
  })

  afterEach(() => {
    process.env.ADMIN_KEY = originalAdminKey
    vi.restoreAllMocks()
  })

  it('rejects request without Authorization header with 401', async () => {
    const request = new Request(`http://localhost/api/admin/registrations/${FAKE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'manual_checkin' }),
    })
    const res = await patchRegistrationHandler(request, {
      params: Promise.resolve({ id: FAKE_ID }),
    })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
    expect(res.headers.get('cache-control')).toContain('no-store')
  })

  it('rejects request with invalid Bearer token with 401', async () => {
    const request = new Request(`http://localhost/api/admin/registrations/${FAKE_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer wrong-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'manual_checkin' }),
    })
    const res = await patchRegistrationHandler(request, {
      params: Promise.resolve({ id: FAKE_ID }),
    })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects invalid action payload with 400 validation error', async () => {
    const request = new Request(`http://localhost/api/admin/registrations/${FAKE_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TEST_ADMIN_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'invalid_action_name' }),
    })
    const res = await patchRegistrationHandler(request, {
      params: Promise.resolve({ id: FAKE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when target registration does not exist', async () => {
    const request = new Request(`http://localhost/api/admin/registrations/${FAKE_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TEST_ADMIN_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'manual_checkin' }),
    })
    const res = await patchRegistrationHandler(request, {
      params: Promise.resolve({ id: FAKE_ID }),
    })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.code).toBe('NOT_FOUND')
  })
})
