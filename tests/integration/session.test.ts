import { describe, expect, it } from 'vitest'

import { POST as clearSessionHandler } from '@/app/api/session/clear/route'

describe('POST /api/session/clear Integration Tests', () => {
  it('clears ticket cookie with Max-Age=0 and returns { ok: true }', async () => {
    const res = await clearSessionHandler()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toEqual({ ok: true })

    // Validasi spec 08-TESTING.md §4.3b & 04-API-SPEC.md §3.1
    const cookieHeader = res.headers.get('set-cookie')
    expect(cookieHeader).toBeDefined()
    expect(cookieHeader).toMatch(/padel_ticket=;.*Max-Age=0/i)
    expect(cookieHeader).toContain('padel_ticket=;')
    expect(cookieHeader).toMatch(/HttpOnly/i)
    expect(cookieHeader).toMatch(/Secure/i)
    expect(cookieHeader).toMatch(/SameSite=Lax/i)
    expect(cookieHeader).toMatch(/Path=\//)

    // Cache-Control harus no-store agar respons tidak di-cache browser/proxy
    const cacheControl = res.headers.get('cache-control')
    expect(cacheControl).toContain('no-store')
  })
})
