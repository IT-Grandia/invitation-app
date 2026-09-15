import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET as qrHandler } from '@/app/api/qr/[token]/route'
import { isWellFormedToken, renderTicketQr, ticketUrl } from '@/lib/qr'
import { generateToken, ticketNumber } from '@/lib/token'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Width and height from the IHDR chunk, which always directly follows the signature. */
function pngDimensions(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

function callRoute(token: string, ip = '203.0.113.10') {
  const request = new Request(`http://localhost/api/qr/${token}`, {
    headers: { 'x-forwarded-for': ip },
  })
  return qrHandler(request, { params: Promise.resolve({ token }) })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isWellFormedToken', () => {
  it('accepts a freshly generated token', () => {
    expect(isWellFormedToken(generateToken())).toBe(true)
  })

  it('accepts the fixed seed tokens', () => {
    expect(isWellFormedToken('SEEDA0000000000000000000')).toBe(true)
  })

  it.each([
    ['', 'empty'],
    ['AbC123', 'too short'],
    ['A'.repeat(23), 'one character short'],
    ['A'.repeat(25), 'one character long'],
    ['A'.repeat(23) + '!', 'character outside the alphabet'],
    ['A'.repeat(23) + ' ', 'trailing space'],
    ['https://x.com/t/' + 'A'.repeat(24), 'a full URL instead of a bare token'],
  ])('rejects %j (%s)', (value) => {
    expect(isWellFormedToken(value)).toBe(false)
  })
})

describe('ticketUrl', () => {
  it('builds the ticket URL from NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://padel.example.com')

    expect(ticketUrl('AbC')).toBe('https://padel.example.com/t/AbC')
  })

  it('tolerates a trailing slash on the site URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://padel.example.com/')

    expect(ticketUrl('AbC')).toBe('https://padel.example.com/t/AbC')
  })

  it('falls back to localhost when the variable is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    delete process.env.NEXT_PUBLIC_SITE_URL

    expect(ticketUrl('AbC')).toBe('http://localhost:3000/t/AbC')
  })
})

describe('renderTicketQr', () => {
  it('produces an 800 x 800 PNG', async () => {
    const png = await renderTicketQr(generateToken())

    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true)
    expect(pngDimensions(png)).toEqual({ width: 800, height: 800 })
  })
})

describe('GET /api/qr/[token]', () => {
  it('answers a malformed token with a bare 404 and no body', async () => {
    const response = await callRoute('not-a-token')

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBeNull()
    expect(await response.text()).toBe('')
  })

  it('does not consult the database: an unknown but well-formed token still renders', async () => {
    const response = await callRoute(generateToken())

    expect(response.status).toBe(200)
  })

  it('serves an immutable PNG named after the ticket number', async () => {
    const token = generateToken()
    const response = await callRoute(token)
    const body = Buffer.from(await response.arrayBuffer())

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('content-disposition')).toBe(
      `inline; filename="tiket-padel-${ticketNumber(token)}.png"`,
    )
    expect(response.headers.get('content-length')).toBe(String(body.byteLength))
    expect(body.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true)
  })

  // Budgets are per ticket first: at the venue every phone shares the
  // router's public IP, so a per-client budget alone would starve the queue.
  it('rate limits the 21st request for one ticket, but not another ticket from the same client', async () => {
    const ip = '198.51.100.77'
    const token = generateToken()

    for (let i = 0; i < 20; i++) {
      expect((await callRoute(token, ip)).status).toBe(200)
    }

    const blocked = await callRoute(token, ip)

    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
    expect((await callRoute(generateToken(), ip)).status).toBe(200)
  })
})
