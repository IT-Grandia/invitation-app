'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
          // Placeholder until Turnstile is integrated in feat/a-antispam
          turnstileToken: 'client-pending-token',
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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
        <label htmlFor="fullName" className="font-sans text-sm font-medium text-ink mb-1.5">
          Nama Lengkap <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Contoh: Budi Santoso"
          value={values.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          onBlur={() => handleBlur('fullName')}
          aria-invalid={Boolean(errors.fullName && touched.fullName)}
          aria-describedby={errors.fullName && touched.fullName ? 'fullName-error' : undefined}
          className={`min-h-tap w-full rounded-card border bg-surface px-4 py-2 text-ink placeholder:text-ink-muted/50 transition-colors focus:outline-none focus-visible:outline-3 focus-visible:outline-primary ${
            errors.fullName && touched.fullName
              ? 'border-danger focus-visible:outline-danger'
              : 'border-line-input hover:border-ink-muted'
          }`}
        />
        {errors.fullName && touched.fullName && (
          <p id="fullName-error" role="alert" className="mt-1 text-xs font-medium text-danger">
            {errors.fullName}
          </p>
        )}
      </div>

      {/* Field 2: Nomor WhatsApp */}
      <div className="flex flex-col">
        <label htmlFor="phone" className="font-sans text-sm font-medium text-ink">
          Nomor WhatsApp <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <p className="text-xs text-ink-muted mb-1.5">Tiket akan dikirim ke sini</p>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Contoh: 08123456789"
          value={values.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          aria-invalid={Boolean(errors.phone && touched.phone)}
          aria-describedby={errors.phone && touched.phone ? 'phone-error' : undefined}
          className={`min-h-tap w-full rounded-card border bg-surface px-4 py-2 text-ink placeholder:text-ink-muted/50 transition-colors focus:outline-none focus-visible:outline-3 focus-visible:outline-primary ${
            errors.phone && touched.phone
              ? 'border-danger focus-visible:outline-danger'
              : 'border-line-input hover:border-ink-muted'
          }`}
        />
        {errors.phone && touched.phone && (
          <p id="phone-error" role="alert" className="mt-1 text-xs font-medium text-danger">
            {errors.phone}
          </p>
        )}
      </div>

      {/* Field 3: Email (opsional) */}
      <div className="flex flex-col">
        <label htmlFor="email" className="font-sans text-sm font-medium text-ink mb-1.5">
          Email <span className="text-xs font-normal text-ink-muted">(opsional)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Contoh: budi@example.com"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          aria-invalid={Boolean(errors.email && touched.email)}
          aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
          className={`min-h-tap w-full rounded-card border bg-surface px-4 py-2 text-ink placeholder:text-ink-muted/50 transition-colors focus:outline-none focus-visible:outline-3 focus-visible:outline-primary ${
            errors.email && touched.email
              ? 'border-danger focus-visible:outline-danger'
              : 'border-line-input hover:border-ink-muted'
          }`}
        />
        {errors.email && touched.email && (
          <p id="email-error" role="alert" className="mt-1 text-xs font-medium text-danger">
            {errors.email}
          </p>
        )}
      </div>

      {/* Field 4: Catatan (opsional) */}
      <div className="flex flex-col">
        <label htmlFor="notes" className="font-sans text-sm font-medium text-ink mb-1.5">
          Catatan <span className="text-xs font-normal text-ink-muted">(opsional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Catatan tambahan untuk panitia (opsional)"
          value={values.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          aria-invalid={Boolean(errors.notes && touched.notes)}
          aria-describedby={errors.notes && touched.notes ? 'notes-error' : undefined}
          className={`w-full rounded-card border bg-surface p-3 text-ink placeholder:text-ink-muted/50 transition-colors focus:outline-none focus-visible:outline-3 focus-visible:outline-primary resize-y min-h-[5.5rem] ${
            errors.notes && touched.notes
              ? 'border-danger focus-visible:outline-danger'
              : 'border-line-input hover:border-ink-muted'
          }`}
        />
        {errors.notes && touched.notes && (
          <p id="notes-error" role="alert" className="mt-1 text-xs font-medium text-danger">
            {errors.notes}
          </p>
        )}
      </div>

      {/* Field 5: Checkbox Consent */}
      <div className="flex flex-col mt-1">
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            name="consent"
            checked={values.consent}
            onChange={(e) => handleChange('consent', e.target.checked)}
            onBlur={() => handleBlur('consent')}
            aria-invalid={Boolean(errors.consent && touched.consent)}
            aria-describedby={errors.consent && touched.consent ? 'consent-error' : undefined}
            className="mt-1 h-5 w-5 rounded border border-line-input bg-surface accent-primary focus-visible:outline-3 focus-visible:outline-primary cursor-pointer"
          />
          <span className="text-sm leading-snug text-ink">
            Saya setuju data saya digunakan untuk keperluan acara ini.{' '}
            <span className="text-danger" aria-hidden="true">*</span>
          </span>
        </label>
        {errors.consent && touched.consent && (
          <p id="consent-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {errors.consent}
          </p>
        )}
      </div>

      {/* Form-level Error Banner (positioned above submit button per UX spec) */}
      {formError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-card border border-danger/30 bg-danger/10 p-4 text-sm text-danger flex flex-col gap-1.5"
        >
          <p className="font-medium">{formError}</p>
          {contactWhatsapp && (
            <p className="text-xs text-ink-muted">
              Hubungi panitia via{' '}
              <a
                href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink font-semibold text-primary"
              >
                WhatsApp Panitia
              </a>
            </p>
          )}
        </div>
      )}

      {/* Submit Button (Primary action button: bg-primary, text-on-primary, rounded-pill, min-h-tap, shadow-card) */}
      <div className="mt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-tap w-full rounded-pill bg-primary px-8 font-display text-lg font-bold text-on-primary shadow-card transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg
                className="h-5 w-5 animate-spin text-on-primary"
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
              <span>Membuat tiket...</span>
            </>
          ) : (
            'Daftar & Buat Tiket'
          )}
        </button>
      </div>
    </form>
  )
}
