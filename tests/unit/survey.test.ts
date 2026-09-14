import { describe, expect, it } from 'vitest'

import {
  COMMUNITIES,
  COMMUNITY_LABELS,
  INVESTMENT_INTERESTS,
  communitySchema,
  investmentInterestsSchema,
  parseCommunity,
  parseInvestmentInterests,
} from '@/lib/validation/survey'

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

describe('communitySchema', () => {
  it.each([...COMMUNITIES])('accepts %s', (value) => {
    expect(communitySchema.safeParse(value).success).toBe(true)
  })

  it.each([
    ['nothing chosen', ''],
    ['a community that is not on the list', 'hipmi_jakarta'],
    ['a list of communities', ['club_79']],
    ['undefined', undefined],
  ])('rejects %s', (_label, value) => {
    expect(communitySchema.safeParse(value).success).toBe(false)
  })

  it('carries the name the organiser uses for each code', () => {
    expect(COMMUNITY_LABELS).toEqual({
      club_79: 'Club 79',
      womenpreneur_hipmi_jateng: 'Womenpreneur Hipmi Jateng',
    })
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

describe('parseCommunity', () => {
  it('keeps a known code', () => {
    expect(parseCommunity('club_79')).toBe('club_79')
  })

  it.each([
    ['no answer, as written before the column existed', null],
    ['a code that is no longer offered', 'hipmi_jakarta'],
  ])('returns null for %s', (_label, raw) => {
    expect(parseCommunity(raw)).toBeNull()
  })
})
