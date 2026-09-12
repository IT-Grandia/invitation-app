import { afterEach, describe, expect, it, vi } from 'vitest'

import { ticketUrl } from '@/lib/qr'
import { isSiteUrlConfigured, siteUrl } from '@/lib/site-url'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('siteUrl', () => {
  it('returns the configured origin without a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://padel.example.com/')

    expect(siteUrl()).toBe('https://padel.example.com')
  })

  it('falls back to localhost when the variable is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    delete process.env.NEXT_PUBLIC_SITE_URL

    expect(siteUrl()).toBe('http://localhost:3000')
  })

  // The case that broke the build: Vercel lets a variable exist with no value,
  // and `??` let that empty string through to new URL('').
  it.each(['', '   '])('treats a present-but-blank value (%j) as unset', (blank) => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', blank)

    expect(siteUrl()).toBe('http://localhost:3000')
    expect(isSiteUrlConfigured()).toBe(false)
    expect(() => new URL(siteUrl())).not.toThrow()
  })
})

describe('ticketUrl in production', () => {
  it('refuses to issue a URL when the site origin is not configured', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    expect(() => ticketUrl('A'.repeat(24))).toThrow(/NEXT_PUBLIC_SITE_URL/)
  })

  it('issues the URL normally once the origin is configured', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://padel.example.com')

    expect(ticketUrl('A'.repeat(24))).toBe(`https://padel.example.com/t/${'A'.repeat(24)}`)
  })

  it('still falls back outside production so tests and dev keep working', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    expect(ticketUrl('A'.repeat(24))).toBe(`http://localhost:3000/t/${'A'.repeat(24)}`)
  })
})
