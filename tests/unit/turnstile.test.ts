import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyTurnstileToken } from '@/lib/turnstile'

describe('Turnstile Verification Utility (lib/turnstile.ts)', () => {
  const originalEnv = process.env.TURNSTILE_SECRET_KEY

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = originalEnv
    vi.restoreAllMocks()
  })

  it('bypasses gracefully with failOpen when TURNSTILE_SECRET_KEY is not set', async () => {
    delete process.env.TURNSTILE_SECRET_KEY

    const res = await verifyTurnstileToken('any-token')
    expect(res.success).toBe(true)
    expect(res.failOpen).toBe(true)
  })

  it('returns false if token is empty string or whitespace', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key'

    const emptyRes = await verifyTurnstileToken('')
    expect(emptyRes.success).toBe(false)
    expect(emptyRes.error).toBe('MISSING_TOKEN')

    const spaceRes = await verifyTurnstileToken('   ')
    expect(spaceRes.success).toBe(false)
  })

  it('verifies valid token successfully against Cloudflare endpoint', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, challenge_ts: '2026-09-10T00:00:00Z' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await verifyTurnstileToken('valid-turnstile-token', '192.168.1.1')
    expect(res.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'test-secret-key',
          response: 'valid-turnstile-token',
          remoteip: '192.168.1.1',
        }),
      }),
    )
  })

  it('returns failure when Cloudflare reports verification failure', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key'

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const res = await verifyTurnstileToken('invalid-turnstile-token')
    expect(res.success).toBe(false)
    expect(res.error).toBe('invalid-input-response')
  })

  it('fails open when Cloudflare returns server error (HTTP 500)', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key'

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal Cloudflare Error', { status: 500 }),
    )

    const res = await verifyTurnstileToken('any-token')
    expect(res.success).toBe(true)
    expect(res.failOpen).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('fails open when network request throws or times out', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key'

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network connection timeout'))

    const res = await verifyTurnstileToken('any-token')
    expect(res.success).toBe(true)
    expect(res.failOpen).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
  })
})
