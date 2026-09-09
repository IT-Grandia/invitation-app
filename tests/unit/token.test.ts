import { describe, expect, it } from 'vitest'

import { TOKEN_LENGTH, extractToken, generateToken, ticketNumber } from '@/lib/token'

describe('generateToken', () => {
  it('produces a URL-safe token of the expected length', () => {
    const token = generateToken()

    expect(token).toHaveLength(TOKEN_LENGTH)
    expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/)
  })

  it('produces no collisions across 100000 tokens', () => {
    const tokens = new Set(Array.from({ length: 100_000 }, generateToken))

    expect(tokens.size).toBe(100_000)
  })
})

describe('extractToken', () => {
  it.each([
    ['https://padel.example.com/t/AbC123', 'AbC123'],
    ['https://padel.example.com/t/AbC123?utm_source=wa', 'AbC123'],
    ['https://padel.example.com/t/AbC123#anchor', 'AbC123'],
    ['AbC123', 'AbC123'],
    ['  AbC123  ', 'AbC123'],
    ['SEEDTOKEN00000000000000A', 'SEEDTOKEN00000000000000A'],
  ])('extracts the token from %s', (input, expected) => {
    expect(extractToken(input)).toBe(expected)
  })

  it.each([['', 'empty'], ['   ', 'whitespace'], ['not a token!', 'illegal characters']])(
    'returns null for %s (%s)',
    (input) => {
      expect(extractToken(input)).toBeNull()
    },
  )

  it('reads back a token embedded in a generated ticket URL', () => {
    const token = generateToken()

    expect(extractToken(`https://padel.example.com/t/${token}`)).toBe(token)
  })
})

describe('ticketNumber', () => {
  it('takes the first eight characters in upper case', () => {
    expect(ticketNumber('abc123xyz789DefGhi456Jk0')).toBe('ABC123XY')
  })

  it('is stable for the same token', () => {
    const token = generateToken()

    expect(ticketNumber(token)).toBe(ticketNumber(token))
  })
})
