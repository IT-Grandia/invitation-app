import { z } from 'zod'

// Disable JIT evaluation probing (`new Function("")`) to comply with strict CSP in production
z.config({ jitless: true })

/**
 * Answers to the survey on the registration form, stored as codes so the wording
 * shown to participants can change without rewriting rows. The form decides how
 * each code is labelled.
 */
export const INVESTMENT_INTERESTS = ['gold', 'deposit', 'stocks', 'property'] as const

export type InvestmentInterest = (typeof INVESTMENT_INTERESTS)[number]

export const MAX_INVESTMENT_INTERESTS = 2

export const investmentInterestsSchema = z
  .array(z.enum(INVESTMENT_INTERESTS, { message: 'Pilihan minat investasi tidak dikenali.' }), {
    message: 'Pilih minimal satu minat investasi.',
  })
  .min(1, 'Pilih minimal satu minat investasi.')
  .max(MAX_INVESTMENT_INTERESTS, 'Pilih paling banyak dua minat investasi.')
  .refine((values) => new Set(values).size === values.length, {
    message: 'Minat investasi tidak boleh dipilih dua kali.',
  })

export const COMMUNITIES = ['club_79', 'womenpreneur_hipmi_jateng'] as const

export type Community = (typeof COMMUNITIES)[number]

/** The names as the organiser writes them, for the form and the spreadsheet. */
export const COMMUNITY_LABELS: Record<Community, string> = {
  club_79: 'Club 79',
  womenpreneur_hipmi_jateng: 'Womenpreneur Hipmi Jateng',
}

export const communitySchema = z.enum(COMMUNITIES, { message: 'Pilih salah satu komunitas.' })

/**
 * Reading is lenient where writing is strict: registrations created before these
 * columns existed hold no answer, and a code retired later should not break the
 * pages that display it.
 */
export function parseInvestmentInterests(raw: unknown): InvestmentInterest[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.filter((value): value is InvestmentInterest =>
    INVESTMENT_INTERESTS.includes(value as InvestmentInterest),
  )
}

export function parseCommunity(raw: unknown): Community | null {
  return COMMUNITIES.includes(raw as Community) ? (raw as Community) : null
}
