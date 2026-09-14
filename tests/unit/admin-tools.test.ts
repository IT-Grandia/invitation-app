import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as exportHandler } from '@/app/api/admin/export/route'
import { POST as syncSheetHandler } from '@/app/api/admin/sync-sheet/route'
import { POST as toggleRegistrationHandler } from '@/app/api/admin/toggle-registration/route'

describe('Admin Tools Endpoints (Sync Sheets, Export CSV, Toggle Registration)', () => {
  const originalAdminKey = process.env.ADMIN_KEY
  const TEST_ADMIN_KEY = 'test-admin-secret-key-12345'

  beforeEach(() => {
    process.env.ADMIN_KEY = TEST_ADMIN_KEY
  })

  afterEach(() => {
    process.env.ADMIN_KEY = originalAdminKey
    vi.restoreAllMocks()
  })

  describe('POST /api/admin/sync-sheet', () => {
    it('rejects unauthenticated request with 401', async () => {
      const request = new Request('http://localhost/api/admin/sync-sheet', {
        method: 'POST',
      })
      const res = await syncSheetHandler(request)

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('rejects invalid bearer key with 401', async () => {
      const request = new Request('http://localhost/api/admin/sync-sheet', {
        method: 'POST',
        headers: { Authorization: 'Bearer invalid-key' },
      })
      const res = await syncSheetHandler(request)

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/export', () => {
    it('rejects unauthenticated request with 401', async () => {
      const request = new Request('http://localhost/api/admin/export')
      const res = await exportHandler(request)

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('rejects invalid bearer key with 401', async () => {
      const request = new Request('http://localhost/api/admin/export', {
        headers: { Authorization: 'Bearer invalid-key' },
      })
      const res = await exportHandler(request)

      expect(res.status).toBe(401)
    })

    it('accepts valid bearer key and returns CSV content without secret tokens', async () => {
      const request = new Request('http://localhost/api/admin/export', {
        headers: { Authorization: `Bearer ${TEST_ADMIN_KEY}` },
      })
      const res = await exportHandler(request)

      expect(res.status).not.toBe(401)
      expect(res.headers.get('cache-control')).toContain('no-store')

      if (res.status === 200) {
        expect(res.headers.get('content-type')).toContain('text/csv')
        expect(res.headers.get('content-disposition')).toContain('attachment;')

        const csvText = await res.text()
        const [headerLine] = csvText.split('\r\n')
        expect(headerLine).toContain('No Tiket')
        expect(headerLine).toContain('Name')
        expect(headerLine).toContain('WhatsApp')
        expect(headerLine).toContain('Community')
        expect(headerLine).toContain('Investment Interest')
        expect(headerLine).toContain('RSVP')
        expect(headerLine).toContain('Check-in')

        // Security rule: raw token must not be in headers or csv output
        expect(headerLine).not.toContain('token')
      }
    })
  })

  describe('POST /api/admin/toggle-registration', () => {
    it('rejects unauthenticated request with 401', async () => {
      const request = new Request('http://localhost/api/admin/toggle-registration', {
        method: 'POST',
      })
      const res = await toggleRegistrationHandler(request)

      expect(res.status).toBe(401)
    })

    it('rejects invalid bearer key with 401', async () => {
      const request = new Request('http://localhost/api/admin/toggle-registration', {
        method: 'POST',
        headers: { Authorization: 'Bearer invalid-key' },
      })
      const res = await toggleRegistrationHandler(request)

      expect(res.status).toBe(401)
    })
  })
})
