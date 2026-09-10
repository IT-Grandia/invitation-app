import { describe, expect, it } from 'vitest'

import { bearerToken, verifyKey } from '@/lib/auth'

const SECRET = 'a-long-enough-staff-key-value'

describe('verifyKey', () => {
  it('accepts the exact key', () => {
    expect(verifyKey(SECRET, SECRET)).toBe(true)
  })

  it.each([
    ['a different key of the same length', 'b-long-enough-staff-key-value'],
    ['a prefix of the key', SECRET.slice(0, 10)],
    ['the key with trailing whitespace', `${SECRET} `],
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, provided) => {
    expect(verifyKey(provided, SECRET)).toBe(false)
  })

  it('rejects everything when no key is configured', () => {
    expect(verifyKey(SECRET, undefined)).toBe(false)
    expect(verifyKey('', undefined)).toBe(false)
  })
})

describe('bearerToken', () => {
  const withHeader = (value?: string) =>
    new Request('https://example.com', value ? { headers: { authorization: value } } : undefined)

  it('reads the token out of a bearer header', () => {
    expect(bearerToken(withHeader(`Bearer ${SECRET}`))).toBe(SECRET)
  })

  it.each([
    ['no header at all', undefined],
    ['a bare value', SECRET],
    ['a different scheme', `Basic ${SECRET}`],
    ['an empty bearer', 'Bearer '],
  ])('returns null for %s', (_label, header) => {
    expect(bearerToken(withHeader(header))).toBeNull()
  })
})
