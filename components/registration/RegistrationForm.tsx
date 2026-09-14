'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { TurnstileWidget } from './TurnstileWidget'

import {
  consentSchema,
  emailSchema,
  fullNameSchema,
  notesSchema,
  phoneSchema,
  registrationFormSchema,
  type RegistrationFormValues,
} from '@/lib/validation/registration'

type FormField = 'fullName' | 'phone' | 'email' | 'notes' | 'consent'

type FormValues = {
  fullName: string
  phone: string
  email: string
  notes: string
  consent: boolean
  // Honeypot field: invisible to real users, trapped bots fill this in
  website: string
}

type FormErrors = Partial<Record<FormField, string>>
type TouchedFields = Partial<Record<FormField, boolean>>

type Props = {
  contactWhatsapp?: string | null
  onSuccess?: (ticketToken: string) => void
  onSubmit?: (data: RegistrationFormValues) => Promise<void>
}

const INITIAL_VALUES: FormValues = {
  fullName: '',
  phone: '',
  email: '',
  notes: '',
  consent: false,
  website: '',
}

export function RegistrationForm({ contactWhatsapp, onSuccess, onSubmit }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<TouchedFields>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [turnstileError, setTurnstileError] = useState<string | null>(null)
  const [turnstileResetTrigger, setTurnstileResetTrigger] = useState(0)

  /**
   * Validates a single field when it loses focus (onBlur).
   * Per UX rules: validation on blur feels guiding, not judgmental like keystroke validation.
   */
  const validateField = (field: FormField, currentValues: FormValues = values): string | null => {
    let result: { success: boolean; error?: { issues: Array<{ message: string }> } }

    switch (field) {
      case 'fullName':
        result = fullNameSchema.safeParse(currentValues.fullName)
        break
      case 'phone':
        result = phoneSchema.safeParse(currentValues.phone)
        break
      case 'email':
        result = emailSchema.safeParse(currentValues.email)
        break
      case 'notes':
        result = notesSchema.safeParse(currentValues.notes)
        break
      case 'consent':
        result = consentSchema.safeParse(currentValues.consent)
        break
    }

    if (!result.success && result.error?.issues[0]) {
      return result.error.issues[0].message
    }
    return null
  }

  const handleBlur = (field: FormField) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const errorMsg = validateField(field)
    setErrors((prev) => ({ ...prev, [field]: errorMsg ?? undefined }))
  }

  const handleChange = (field: FormField, val: string | boolean) => {
    const updatedValues = { ...values, [field]: val }
    setValues(updatedValues)

    // If field already has error and user touches it, clear or revalidate immediately
    if (errors[field]) {
      const errorMsg = validateField(field, updatedValues)
      setErrors((prev) => ({ ...prev, [field]: errorMsg ?? undefined }))
    }
    if (formError) {
      setFormError(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    // 1. Honeypot check: if bot filled this hidden field, fail quietly or reject
    if (values.website.trim().length > 0) {
      setFormError('Spam terdeteksi. Pendaftaran dibatalkan.')
      return
    }

    // 2. Validate all 5 fields
    const validationResult = registrationFormSchema.safeParse({
      fullName: values.fullName,
      phone: values.phone,
      email: values.email,
      notes: values.notes,
      consent: values.consent,
    })

    if (!validationResult.success) {
      const newErrors: FormErrors = {}
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as FormField
        if (fieldName && !newErrors[fieldName]) {
          newErrors[fieldName] = issue.message
        }
      }
      setErrors(newErrors)
      setTouched({
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        consent: true,
      })
      return
    }

    if (!onSubmit && !turnstileToken) {
      setTurnstileError('Selesaikan verifikasi anti-bot sebelum mendaftar.')
      return
    }

    setIsSubmitting(true)

    try {
      if (onSubmit) {
        await onSubmit(validationResult.data)
        return
      }

      // Default registration submission to POST /api/register
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: validationResult.data.fullName,
          phone: validationResult.data.phone,
          email: validationResult.data.email,
          notes: validationResult.data.notes,
          consent: validationResult.data.consent,
          turnstileToken,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const errorCode = data?.error?.code
        const errorMessage = data?.error?.message

        if (errorCode === 'PHONE_ALREADY_REGISTERED') {
          setFormError(
            errorMessage ||
              'Nomor ini sudah terdaftar. Cek link tiket di chat WhatsApp kamu, atau hubungi panitia.',
          )
        } else if (errorCode === 'EVENT_FULL') {
          setFormError(
            errorMessage ||
              'Yah, kuota baru saja penuh. Hubungi panitia untuk waiting list ya.',
          )
        } else if (errorCode === 'REGISTRATION_CLOSED') {
          setFormError(errorMessage || 'Pendaftaran belum dibuka atau sudah ditutup.')
        } else if (errorCode === 'TURNSTILE_FAILED') {
          setTurnstileToken('')
          setTurnstileResetTrigger((prev) => prev + 1)
          setFormError(errorMessage || 'Verifikasi anti-bot gagal. Coba muat ulang halaman.')
        } else {
          setFormError(
            errorMessage ||
              'Ada gangguan di sistem kami. Coba lagi, atau hubungi panitia.',
          )
        }
        return
      }

      const ticketToken = data?.token
      if (onSuccess && ticketToken) {
        onSuccess(ticketToken)
      } else if (ticketToken) {
        router.push(`/t/${ticketToken}`)
      }
    } catch {
      setFormError('Ada gangguan di sistem kami. Coba lagi, atau hubungi panitia.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Honeypot field (hidden from view and assistive tech, traps automated bots) */}
      <div
        className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden opacity-0 pointer-events-none"
        aria-hidden="true"
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => setValues((prev) => ({ ...prev, website: e.target.value }))}
        />
      </div>

      {/* Field 1: Nama Lengkap */}
      <div className="flex flex-col">
        <label htmlFor="fullName" className="text-xs sm:text-sm font-semibold text-[#4E644D] mb-1.5">
          Nama Lengkap <span className="text-[#9E2A2B]" aria-hidden="true">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Nama lengkap kamu"
          value={values.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          onBlur={() => handleBlur('fullName')}
          aria-invalid={Boolean(errors.fullName && touched.fullName)}
          aria-describedby={errors.fullName && touched.fullName ? 'fullName-error' : undefined}
          className={`min-h-[44px] w-full rounded-[8px] border bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#243024] placeholder:text-[#A6A192] transition-all focus:outline-none focus:ring-2 focus:ring-[#4E644D]/30 focus:border-[#4E644D] ${
            errors.fullName && touched.fullName
              ? 'border-[#9E2A2B] focus:ring-[#9E2A2B]/40 focus:border-[#9E2A2B]'
              : 'border-[#D6D1C2] hover:border-[#B3AC9B]'
          }`}
        />
        {errors.fullName && touched.fullName && (
          <p id="fullName-error" role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B]">
            {errors.fullName}
          </p>
        )}
      </div>

      {/* Field 2: Nomor WhatsApp */}
      <div className="flex flex-col">
        <label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-[#4E644D] mb-1.5">
          Nomor WhatsApp <span className="text-[#9E2A2B]" aria-hidden="true">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08123456789 atau 628..."
          value={values.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          aria-invalid={Boolean(errors.phone && touched.phone)}
          aria-describedby={errors.phone && touched.phone ? 'phone-error' : undefined}
          className={`min-h-[44px] w-full rounded-[8px] border bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#243024] placeholder:text-[#A6A192] transition-all focus:outline-none focus:ring-2 focus:ring-[#4E644D]/30 focus:border-[#4E644D] ${
            errors.phone && touched.phone
              ? 'border-[#9E2A2B] focus:ring-[#9E2A2B]/40 focus:border-[#9E2A2B]'
              : 'border-[#D6D1C2] hover:border-[#B3AC9B]'
          }`}
        />
        {errors.phone && touched.phone && (
          <p id="phone-error" role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B]">
            {errors.phone}
          </p>
        )}
      </div>

      {/* Field 3: Email (opsional) */}
      <div className="flex flex-col">
        <label htmlFor="email" className="text-xs sm:text-sm font-semibold text-[#4E644D] mb-1.5">
          Email <span className="text-xs font-normal text-[#4E644D]/70">(opsional)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          aria-invalid={Boolean(errors.email && touched.email)}
          aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
          className={`min-h-[44px] w-full rounded-[8px] border bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#243024] placeholder:text-[#A6A192] transition-all focus:outline-none focus:ring-2 focus:ring-[#4E644D]/30 focus:border-[#4E644D] ${
            errors.email && touched.email
              ? 'border-[#9E2A2B] focus:ring-[#9E2A2B]/40 focus:border-[#9E2A2B]'
              : 'border-[#D6D1C2] hover:border-[#B3AC9B]'
          }`}
        />
        {errors.email && touched.email && (
          <p id="email-error" role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B]">
            {errors.email}
          </p>
        )}
      </div>

      {/* Field 4: Catatan (opsional) */}
      <div className="flex flex-col">
        <label htmlFor="notes" className="text-xs sm:text-sm font-semibold text-[#4E644D] mb-1.5">
          Catatan <span className="text-xs font-normal text-[#4E644D]/70">(opsional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Catatan tambahan untuk panitia (opsional)"
          value={values.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          aria-invalid={Boolean(errors.notes && touched.notes)}
          aria-describedby={errors.notes && touched.notes ? 'notes-error' : undefined}
          className={`w-full rounded-[8px] border bg-[#FFFFFF] p-3 text-sm text-[#243024] placeholder:text-[#A6A192] transition-all focus:outline-none focus:ring-2 focus:ring-[#4E644D]/30 focus:border-[#4E644D] resize-y min-h-[4.5rem] ${
            errors.notes && touched.notes
              ? 'border-[#9E2A2B] focus:ring-[#9E2A2B]/40 focus:border-[#9E2A2B]'
              : 'border-[#D6D1C2] hover:border-[#B3AC9B]'
          }`}
        />
        {errors.notes && touched.notes && (
          <p id="notes-error" role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B]">
            {errors.notes}
          </p>
        )}
      </div>

      {/* Field 5: Checkbox Consent */}
      <div className="flex flex-col mt-0.5">
        <label className="flex items-start gap-2.5 cursor-pointer select-none group">
          <input
            type="checkbox"
            name="consent"
            checked={values.consent}
            onChange={(e) => handleChange('consent', e.target.checked)}
            onBlur={() => handleBlur('consent')}
            aria-invalid={Boolean(errors.consent && touched.consent)}
            aria-describedby={errors.consent && touched.consent ? 'consent-error' : undefined}
            className="mt-0.5 h-4 w-4 rounded-[4px] border-[#D6D1C2] text-[#4E644D] accent-[#4E644D] focus:ring-[#4E644D]/40 cursor-pointer"
          />
          <span className="text-xs leading-snug text-[#2E3B2E]">
            Saya setuju data saya digunakan untuk keperluan acara ini.{' '}
            <span className="text-[#9E2A2B]" aria-hidden="true">*</span>
          </span>
        </label>
        {errors.consent && touched.consent && (
          <p id="consent-error" role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B]">
            {errors.consent}
          </p>
        )}
      </div>

      {/* Field 6: Turnstile Anti-Bot Verification Widget */}
      <div className="flex flex-col items-center">
        <TurnstileWidget
          onVerify={(token) => {
            setTurnstileToken(token)
            setTurnstileError(null)
          }}
          onExpire={() => {
            setTurnstileToken('')
          }}
          onError={() => {
            setTurnstileToken('')
            setTurnstileError('Gagal memuat verifikasi anti-bot. Coba muat ulang halaman.')
          }}
          resetTrigger={turnstileResetTrigger}
        />
        {turnstileError && (
          <p role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B] text-center">
            {turnstileError}
          </p>
        )}
      </div>

      {/* Form-level Error Banner */}
      {formError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-[8px] border border-[#9E2A2B]/30 bg-[#9E2A2B]/10 p-3.5 text-xs text-[#9E2A2B] flex flex-col gap-1.5"
        >
          <p className="font-semibold">{formError}</p>
          {contactWhatsapp && (
            <p className="text-[11px] text-[#243024]/70">
              Hubungi panitia via{' '}
              <a
                href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="underline font-bold text-[#4E644D]"
              >
                WhatsApp Panitia
              </a>
            </p>
          )}
        </div>
      )}

      {/* Submit Button: Pill-shaped RSVP button in secondary #4E644D */}
      <div className="mt-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[48px] w-full rounded-full bg-[#4E644D] hover:bg-[#3E523D] active:translate-y-[1px] px-8 py-3.5 font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold tracking-[0.2em] text-white shadow-[0_4px_16px_rgba(78,100,77,0.28)] transition-all flex items-center justify-center gap-2 uppercase disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <svg
                className="h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Memproses...</span>
            </>
          ) : (
            'RSVP'
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-[#4E644D]/75">
          Tiket QR diterbitkan langsung setelah pendaftaran tersimpan.
        </p>
      </div>
    </form>
  )
}
