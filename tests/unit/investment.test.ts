import { describe, expect, it } from 'vitest'

import {
  INVESTMENT_INTERESTS,
  investmentInterestsSchema,
  parseInvestmentInterests,
} from '@/lib/validation/investment'

describe('investmentInterestsSchema', () => {
  it.each([[['gold']], [['stocks', 'property']]])('accepts %j', (value) => {
    expect(investmentInterestsSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    ['nothing selected', []],
    ['three choices', ['gold', 'stocks', 'property']],
    ['the same choice twice', ['gold', 'gold']],
    ['a choice that is not offered', ['crypto']],
    ['a value that is not a list', 'gold'],
  ])('rejects %s', (_label, value) => {
    expect(investmentInterestsSchema.safeParse(value).success).toBe(false)
  })

  it('offers exactly the four choices on the form', () => {
    expect([...INVESTMENT_INTERESTS]).toEqual(['gold', 'deposit', 'stocks', 'property'])
  })
})

describe('parseInvestmentInterests', () => {
  it('keeps known codes and drops the rest', () => {
    expect(parseInvestmentInterests(['gold', 'crypto', 'property'])).toEqual(['gold', 'property'])
  })

  it.each([
    ['an empty list, as written before the column existed', []],
    ['null', null],
    ['a string', 'gold'],
  ])('returns an empty list for %s', (_label, raw) => {
    expect(parseInvestmentInterests(raw)).toEqual([])
  })
})
