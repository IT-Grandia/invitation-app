import { describe, expect, it } from 'vitest'

import { formatPhoneForDisplay, isValidPhone, normalizePhone } from '@/lib/phone'

describe('normalizePhone', () => {
  it.each([
    ['08123456789', '628123456789'],
    ['+628123456789', '628123456789'],
    ['628123456789', '628123456789'],
    ['8123456789', '628123456789'],
    ['0812-3456-789', '628123456789'],
    ['0812 3456 789', '628123456789'],
    ['  08123456789  ', '628123456789'],
    ['(0812) 3456789', '628123456789'],
    ['+62 812-3456-789', '628123456789'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it('collapses every accepted variant to a single value', () => {
    const variants = ['08123456789', '+628123456789', '628123456789', '0812-3456-789']
    const normalised = new Set(variants.map(normalizePhone))

    expect(normalised.size).toBe(1)
  })

  it.each([
    ['123', 'too short'],
    ['08123', 'too short'],
    ['+1234567890', 'not an Indonesian number'],
    ['628123456789012345', 'too long'],
    ['0217654321', 'landline, not a mobile number'],
    ['bukan nomor', 'not a number at all'],
    ['', 'empty'],
  ])('rejects %s (%s)', (input) => {
    expect(() => normalizePhone(input)).toThrow()
    expect(isValidPhone(input)).toBe(false)
  })
})

describe('formatPhoneForDisplay', () => {
  it.each([
    ['628123456789', '0812-3456-789'],
    ['6281234567890', '0812-3456-7890'],
  ])('renders %s as %s', (stored, expected) => {
    expect(formatPhoneForDisplay(stored)).toBe(expected)
  })

  it('round-trips back to the same stored value', () => {
    const stored = '628123456789'

    expect(normalizePhone(formatPhoneForDisplay(stored))).toBe(stored)
  })
})
