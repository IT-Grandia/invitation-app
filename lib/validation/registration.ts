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

/**
 * Server-side registration API request schema (used on POST /api/register).
 * Requires Turnstile anti-bot token and optional honeypot field.
 */
export const registerApiSchema = registrationFormSchema.extend({
  turnstileToken: z
    .string({ message: 'Verifikasi anti-bot wajib diselesaikan.' })
    .trim()
    .min(1, 'Verifikasi anti-bot wajib diselesaikan.'),
  // Honeypot field for bot detection: if filled by a bot, validation fails.
  website: z.string().max(0, 'Spam terdeteksi.').optional(),
})

/**
 * Community options for the event.
 */
export const COMMUNITY_OPTIONS = ['Club 79', 'Womenpreneur Hipmi Jateng'] as const
export type CommunityOption = (typeof COMMUNITY_OPTIONS)[number]

/**
 * Validates selected community options.
 * Must select at least 1 community.
 */
export const communitySchema = z
  .array(z.string().trim())
  .min(1, 'Pilih minimal 1 komunitas.')

/**
 * Investment instrument options.
 */
export const INVESTMENT_OPTIONS = ['Gold', 'Deposito', 'Stocks', 'Property'] as const
export type InvestmentOption = (typeof INVESTMENT_OPTIONS)[number]

/**
 * Validates participant's investment instrument interests.
 * Must select at least 1 and at most 2 options.
 */
export const investmentInstrumentsSchema = z
  .array(z.enum(INVESTMENT_OPTIONS))
  .min(1, 'Pilih minimal 1 instrumen investasi.')
  .max(2, 'Pilih maksimal 2 instrumen investasi.')

/**
 * Validates participant's event attendance confirmation.
 * Must be either 'yes' or 'no'.
 */
export const attendingSchema = z.enum(['yes', 'no'], {
  message: 'Pilih konfirmasi kehadiran Anda (Yes atau No).',
})

/**
 * Revised client-side registration form schema.
 */
export const revisedRegistrationFormSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  community: communitySchema,
  investmentInstruments: investmentInstrumentsSchema,
  attending: attendingSchema,
})

export type RevisedRegistrationFormInput = z.input<typeof revisedRegistrationFormSchema>
export type RevisedRegistrationFormValues = z.output<typeof revisedRegistrationFormSchema>

export type RegistrationFormInput = z.input<typeof registrationFormSchema>
export type RegistrationFormValues = z.output<typeof registrationFormSchema>

export type RegisterApiInput = z.input<typeof registerApiSchema>
export type RegisterApiValues = z.output<typeof registerApiSchema>

