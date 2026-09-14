import { z } from 'zod'

// Disable JIT evaluation probing (`new Function("")`) to comply with strict CSP in production
// (missing 'unsafe-eval'). Prevents security policy violation reports in browser console.
z.config({ jitless: true })

import { isValidPhone } from '@/lib/phone'

/**
 * Validates participant's full name.
 * Length must be between 3 and 80 characters after trimming whitespace.
 */
export const fullNameSchema = z
  .string({ message: 'Nama lengkap wajib diisi.' })
  .trim()
  .min(3, 'Nama minimal 3 karakter.')
  .max(80, 'Nama maksimal 80 karakter.')

/**
 * Validates participant's mobile phone number.
 * Must be a valid Indonesian mobile number according to lib/phone.ts.
 */
export const phoneSchema = z
  .string({ message: 'Nomor WhatsApp wajib diisi.' })
  .trim()
  .refine((val) => isValidPhone(val), {
    message: 'Nomor WhatsApp tidak valid. Contoh: 08123456789',
  })

/**
 * Validates participant's optional email address.
 * Empty strings are coerced to null.
 */
export const emailSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  .pipe(z.string().email('Format email tidak valid.').nullable())

/**
 * Validates participant's optional notes.
 * Max length is 300 characters. Empty strings are coerced to null.
 */
export const notesSchema = z
  .string()
  .trim()
  .max(300, 'Catatan maksimal 300 karakter.')
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))

/**
 * Validates user consent checkbox.
 * Must be explicitly true.
 */
export const consentSchema = z.literal(true, {
  message: 'Centang persetujuan untuk melanjutkan.',
})

/**
 * Client-side registration form schema (used on /daftar page).
 * Does not include server verification tokens like Turnstile.
 */
export const registrationFormSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  notes: notesSchema,
  consent: consentSchema,
})

import {
  COMMUNITIES,
  type Community,
  type InvestmentInterest,
  investmentInterestsSchema as surveyInvestmentInterestsSchema,
} from '@/lib/validation/survey'

/**
 * Community options for the event.
 */
export const COMMUNITY_OPTIONS = ['Club 79', 'Womenpreneur Hipmi Jateng'] as const
export type CommunityOption = (typeof COMMUNITY_OPTIONS)[number]

/**
 * Validates selected single community (max 1 pilihan).
 */
export const singleCommunitySchema = z.enum(COMMUNITY_OPTIONS, {
  message: 'Pilih salah satu komunitas.',
})

/**
 * Multi-option community schema (retained for backward-compatible array parsing if needed).
 */
export const communitySchema = z
  .array(z.string().trim())
  .min(1, 'Pilih minimal 1 komunitas.')
  .max(1, 'Pilih maksimal 1 komunitas.')

/**
 * Community validation schema for the API endpoint.
 * Strictly enforces max 1 choice by requiring a single value (not an array),
 * accepting either canonical code ('club_79') or human label ('Club 79') and mapping to code.
 */
export const communityApiSchema = z
  .union([
    z.enum(COMMUNITIES),
    z.enum(COMMUNITY_OPTIONS),
  ])
  .transform((val): Community => {
    if (val === 'Club 79') return 'club_79'
    if (val === 'Womenpreneur Hipmi Jateng') return 'womenpreneur_hipmi_jateng'
    return val as Community
  })

/**
 * Investment instrument options.
 */
export const INVESTMENT_OPTIONS = ['Gold', 'Deposito', 'Stocks', 'Property'] as const
export type InvestmentOption = (typeof INVESTMENT_OPTIONS)[number]

/**
 * Validates participant's investment instrument interests on client form.
 * Must select at least 1 and at most 2 options.
 */
export const investmentInstrumentsSchema = z
  .array(z.enum(INVESTMENT_OPTIONS))
  .min(1, 'Pilih minimal 1 instrumen investasi.')
  .max(2, 'Pilih maksimal 2 instrumen investasi.')
  .refine((values) => new Set(values).size === values.length, {
    message: 'Instrumen investasi tidak boleh dipilih dua kali.',
  })

const rawInterestEnum = z.enum([
  'gold',
  'deposit',
  'stocks',
  'property',
  'Gold',
  'Deposito',
  'Stocks',
  'Property',
])

/**
 * Server-side investment interests schema for endpoint validation.
 * Strictly enforces:
 * - min 1 pilihan
 * - max 2 pilihan
 * - no duplicates
 * - transforms to database-compliant lowercase codes ('gold', 'deposit', 'stocks', 'property')
 */
export const investmentInterestsApiSchema = z
  .array(rawInterestEnum, { message: 'Pilih minimal 1 instrumen investasi.' })
  .min(1, 'Pilih minimal 1 instrumen investasi.')
  .max(2, 'Pilih maksimal 2 instrumen investasi.')
  .refine((values) => new Set(values).size === values.length, {
    message: 'Instrumen investasi tidak boleh dipilih dua kali.',
  })
  .transform((arr): InvestmentInterest[] =>
    arr.map((item) => {
      const lower = item.toLowerCase()
      if (lower === 'deposito' || lower === 'deposit') return 'deposit'
      return lower as InvestmentInterest
    }),
  )
  .pipe(surveyInvestmentInterestsSchema)

/**
 * Validates participant's event attendance confirmation on client.
 * Must be either 'yes' or 'no' (max 1 pilihan).
 */
export const attendingSchema = z.enum(['yes', 'no'], {
  message: 'Pilih konfirmasi kehadiran Anda (Yes atau No).',
})

/**
 * Server-side attendance validation schema for API endpoint (max 1 pilihan).
 * Accepts boolean or 'yes'/'no' string and transforms to boolean.
 */
export const attendingApiSchema = z.union([
  z.boolean(),
  z.enum(['yes', 'no']).transform((val) => val === 'yes'),
  z.enum(['true', 'false']).transform((val) => val === 'true'),
])

/**
 * Server-side registration API request schema (used on POST /api/register).
 * Requires Turnstile anti-bot token, optional honeypot field,
 * and validates community (max 1), investment interests (min 1, max 2), and attending (max 1).
 */
export const registerApiSchema = registrationFormSchema.extend({
  turnstileToken: z
    .string({ message: 'Verifikasi anti-bot wajib diselesaikan.' })
    .trim()
    .min(1, 'Verifikasi anti-bot wajib diselesaikan.'),
  website: z.string().max(0, 'Spam terdeteksi.').optional(),
  consent: consentSchema.optional().default(true),
  community: communityApiSchema.optional().nullable(),
  investmentInterests: investmentInterestsApiSchema.optional().default([]),
  investmentInstruments: investmentInterestsApiSchema.optional(),
  attending: attendingApiSchema.optional().default(true),
})

/**
 * Revised client-side registration form schema.
 */
export const revisedRegistrationFormSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  community: singleCommunitySchema,
  investmentInstruments: investmentInstrumentsSchema,
  attending: attendingSchema,
})

export type RevisedRegistrationFormInput = z.input<typeof revisedRegistrationFormSchema>
export type RevisedRegistrationFormValues = z.output<typeof revisedRegistrationFormSchema>

export type RegistrationFormInput = z.input<typeof registrationFormSchema>
export type RegistrationFormValues = z.output<typeof registrationFormSchema>

export type RegisterApiInput = z.input<typeof registerApiSchema>
export type RegisterApiValues = z.output<typeof registerApiSchema>


