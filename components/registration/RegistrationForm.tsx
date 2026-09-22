'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { TurnstileWidget } from './TurnstileWidget'

import {
  attendingSchema,
  COMMUNITY_OPTIONS,
  fullNameSchema,
  INVESTMENT_OPTIONS,
  investmentInstrumentsSchema,
  phoneSchema,
  revisedRegistrationFormSchema,
  singleCommunitySchema,
  toEnglishError,
  toEnglishServerApiError,
  type CommunityOption,
  type InvestmentOption,
  type RevisedRegistrationFormValues,
} from '@/lib/validation/registration'
type FormField = 'fullName' | 'phone' | 'community' | 'investmentInstruments' | 'attending'

type FormValues = {
  fullName: string
  phone: string
  community: CommunityOption | ''
  investmentInstruments: InvestmentOption[]
  attending: 'yes' | 'no' | ''
  // Honeypot field: invisible to real users, trapped bots fill this in
  website: string
}

type FormErrors = Partial<Record<FormField, string>>
type TouchedFields = Partial<Record<FormField, boolean>>

type Props = {
  contactWhatsapp?: string | null
  onSuccess?: (ticketToken: string) => void
  onSubmit?: (data: RevisedRegistrationFormValues) => Promise<void>
}

const INITIAL_VALUES: FormValues = {
  fullName: '',
  phone: '',
  community: '',
  investmentInstruments: [],
  attending: '',
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
      case 'community':
        result = singleCommunitySchema.safeParse(currentValues.community)
        break
      case 'investmentInstruments':
        result = investmentInstrumentsSchema.safeParse(currentValues.investmentInstruments)
        break
      case 'attending':
        result = attendingSchema.safeParse(currentValues.attending)
        break
    }

    if (!result.success && result.error?.issues[0]) {
      return toEnglishError(result.error.issues[0].message)
    }
    return null
  }

  const handleBlur = (field: FormField) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const errorMsg = validateField(field)
    setErrors((prev) => ({ ...prev, [field]: errorMsg ?? undefined }))
  }

  const handleChange = (field: FormField, val: unknown) => {
    const updatedValues = { ...values, [field]: val }
    setValues(updatedValues)

    if (errors[field]) {
      const errorMsg = validateField(field, updatedValues)
      setErrors((prev) => ({ ...prev, [field]: errorMsg ?? undefined }))
    }
    if (formError) {
      setFormError(null)
    }
  }

  const handleCommunitySelect = (option: CommunityOption) => {
    setTouched((prev) => ({ ...prev, community: true }))
    const updatedValues = { ...values, community: option }
    setValues(updatedValues)

    const errorMsg = validateField('community', updatedValues)
    setErrors((prev) => ({ ...prev, community: errorMsg ?? undefined }))
    if (formError) setFormError(null)
  }

  const handleInvestmentToggle = (item: InvestmentOption) => {
    const exists = values.investmentInstruments.includes(item)

    if (exists) {
      const updated = values.investmentInstruments.filter((i) => i !== item)
      setTouched((prev) => ({ ...prev, investmentInstruments: true }))
      const updatedValues = { ...values, investmentInstruments: updated }
      setValues(updatedValues)

      const errorMsg = validateField('investmentInstruments', updatedValues)
      setErrors((prev) => ({ ...prev, investmentInstruments: errorMsg ?? undefined }))
    } else {
      if (values.investmentInstruments.length >= 2) {
        setTouched((prev) => ({ ...prev, investmentInstruments: true }))
        setErrors((prev) => ({
          ...prev,
          investmentInstruments: 'You can select a maximum of 2 investment instruments.',
        }))
        return
      }

      const updated = [...values.investmentInstruments, item]
      setTouched((prev) => ({ ...prev, investmentInstruments: true }))
      const updatedValues = { ...values, investmentInstruments: updated }
      setValues(updatedValues)

      const errorMsg = validateField('investmentInstruments', updatedValues)
      setErrors((prev) => ({ ...prev, investmentInstruments: errorMsg ?? undefined }))
    }

    if (formError) setFormError(null)
  }

  const handleAttendingChange = (val: 'yes' | 'no') => {
    setTouched((prev) => ({ ...prev, attending: true }))
    const updatedValues = { ...values, attending: val }
    setValues(updatedValues)

    const errorMsg = validateField('attending', updatedValues)
    setErrors((prev) => ({ ...prev, attending: errorMsg ?? undefined }))
    if (formError) setFormError(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    // 1. Honeypot check
    if (values.website.trim().length > 0) {
      setFormError('Spam detected. Submission canceled.')
      return
    }

    // 2. Validate all fields
    const validationResult = revisedRegistrationFormSchema.safeParse({
      fullName: values.fullName,
      phone: values.phone,
      community: values.community,
      investmentInstruments: values.investmentInstruments,
      attending: values.attending,
    })

    if (!validationResult.success) {
      const newErrors: FormErrors = {}
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as FormField
        if (fieldName && !newErrors[fieldName]) {
          newErrors[fieldName] = toEnglishError(issue.message)
        }
      }
      setErrors(newErrors)
      setTouched({
        fullName: true,
        phone: true,
        community: true,
        investmentInstruments: true,
        attending: true,
      })
      return
    }

    if (!onSubmit && !turnstileToken) {
      setTurnstileError('Please complete the security verification before submitting.')
      return
    }

    setIsSubmitting(true)

    try {
      if (onSubmit) {
        await onSubmit(validationResult.data)
        return
      }

      // Default registration submission to existing POST /api/register
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: validationResult.data.fullName,
          phone: validationResult.data.phone,
          email: null,
          notes: null,
          community: validationResult.data.community,
          investmentInstruments: validationResult.data.investmentInstruments,
          attending: validationResult.data.attending === 'yes',
          consent: true,
          turnstileToken,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const errorCode = data?.error?.code
        const errorMessage = data?.error?.message

        if (errorCode === 'TURNSTILE_FAILED') {
          setTurnstileToken('')
          setTurnstileResetTrigger((prev) => prev + 1)
        } else if (errorCode === 'VALIDATION_ERROR') {
          if (data?.error?.details && typeof data.error.details === 'object') {
            const serverFieldErrors = data.error.details as Record<
              string,
              string[] | string | undefined
            >
            const mappedErrors: FormErrors = {}
            for (const [key, val] of Object.entries(serverFieldErrors)) {
              const msg = Array.isArray(val) ? val[0] : val
              if (typeof msg === 'string') {
                if (key === 'fullName') mappedErrors.fullName = toEnglishError(msg)
                else if (key === 'phone') mappedErrors.phone = toEnglishError(msg)
                else if (key === 'community') mappedErrors.community = toEnglishError(msg)
                else if (key === 'investmentInstruments' || key === 'investmentInterests') {
                  mappedErrors.investmentInstruments = toEnglishError(msg)
                } else if (key === 'attending') mappedErrors.attending = toEnglishError(msg)
              }
            }
            if (Object.keys(mappedErrors).length > 0) {
              setErrors((prev) => ({ ...prev, ...mappedErrors }))
              setTouched({
                fullName: true,
                phone: true,
                community: true,
                investmentInstruments: true,
                attending: true,
              })
            }
          }
        }

        setFormError(toEnglishServerApiError(errorCode, errorMessage))
        return
      }

      const ticketToken = data?.token
      if (validationResult.data.attending === 'no') {
        if (onSuccess && ticketToken) {
          onSuccess(ticketToken)
        }
        router.push('/')
      } else if (onSuccess && ticketToken) {
        onSuccess(ticketToken)
      } else if (ticketToken) {
        router.push(`/t/${ticketToken}`)
      }
    } catch {
      setFormError('System issue encountered. Please try again or contact organizers.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 text-left">
      {/* Important Notes Callout Banner */}
      <div className="rounded-md border border-line bg-surface-2 p-3.5 text-xs text-ink">
        <div className="flex items-start gap-2.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary"
            aria-hidden="true"
          >
            i
          </span>
          <div className="space-y-1">
            <p className="font-sans text-xs font-bold tracking-[0.08em] text-ink uppercase">
              Important Notes
            </p>
            <ul className="space-y-1 text-ink-muted leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold select-none">•</span>
                <span>This invitation is valid for 1 padel player.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold select-none">•</span>
                <span>You are welcome to bring a supporter.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Honeypot field (hidden from view, traps automated bots) */}
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

      {/* Field 1: Full Name */}
      <div className="flex flex-col">
        <label
          htmlFor="fullName"
          className="font-sans text-xs font-semibold tracking-[0.08em] text-ink uppercase mb-1.5 flex items-center gap-1"
        >
          Full Name <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          value={values.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          onBlur={() => handleBlur('fullName')}
          aria-invalid={Boolean(errors.fullName && touched.fullName)}
          aria-describedby={errors.fullName && touched.fullName ? 'fullName-error' : undefined}
          className={`min-h-tap w-full rounded-md border bg-surface px-4 py-2.5 font-sans text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:outline-none focus:ring-2 ${
            errors.fullName && touched.fullName
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-line-input hover:border-ink focus:border-primary focus:ring-primary/20'
          }`}
        />
        {errors.fullName && touched.fullName && (
          <p id="fullName-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {errors.fullName}
          </p>
        )}
      </div>

      {/* Field 2: WhatsApp Number */}
      <div className="flex flex-col">
        <label
          htmlFor="phone"
          className="font-sans text-xs font-semibold tracking-[0.08em] text-ink uppercase mb-1.5 flex items-center gap-1"
        >
          WhatsApp Number <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. 08123456789 or +628..."
          value={values.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          aria-invalid={Boolean(errors.phone && touched.phone)}
          aria-describedby={errors.phone && touched.phone ? 'phone-error' : undefined}
          className={`min-h-tap w-full rounded-md border bg-surface px-4 py-2.5 font-sans text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:outline-none focus:ring-2 ${
            errors.phone && touched.phone
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-line-input hover:border-ink focus:border-primary focus:ring-primary/20'
          }`}
        />
        {errors.phone && touched.phone && (
          <p id="phone-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {errors.phone}
          </p>
        )}
      </div>

      {/* Field 3: Community */}
      <div className="flex flex-col">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-sans text-xs font-semibold tracking-[0.08em] text-ink uppercase">
            Community <span className="text-danger" aria-hidden="true">*</span>
          </span>
          <span className="text-xs text-ink-muted">Select one</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {COMMUNITY_OPTIONS.map((option) => {
            const isChecked = values.community === option
            return (
              <label
                key={option}
                tabIndex={0}
                role="radio"
                aria-checked={isChecked}
                onClick={() => handleCommunitySelect(option)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    handleCommunitySelect(option)
                  }
                }}
                className={`min-h-tap flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer select-none text-left ${
                  isChecked
                    ? 'border-primary bg-surface-2 ring-1 ring-primary shadow-xs'
                    : 'border-line-input bg-surface hover:bg-surface-2/60'
                }`}
              >
                <div
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    isChecked
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-line-input bg-surface'
                  }`}
                  aria-hidden="true"
                >
                  {isChecked && (
                    <svg
                      className="w-3 h-3 stroke-current"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="font-sans text-sm font-medium text-ink">
                  {option}
                </span>
              </label>
            )
          })}
        </div>
        {errors.community && touched.community && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {errors.community}
          </p>
        )}
      </div>

      {/* Field 4: Investment Instruments */}
      <div className="flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1.5 gap-0.5">
          <span className="font-sans text-xs font-semibold tracking-[0.08em] text-ink uppercase">
            Investment Interests <span className="text-danger" aria-hidden="true">*</span>
          </span>
          <span className="text-xs text-ink-muted">
            Choose 1 to 2
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {INVESTMENT_OPTIONS.map((item) => {
            const isChecked = values.investmentInstruments.includes(item)
            return (
              <label
                key={item}
                tabIndex={0}
                role="checkbox"
                aria-checked={isChecked}
                onClick={() => handleInvestmentToggle(item)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    handleInvestmentToggle(item)
                  }
                }}
                className={`min-h-tap flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer select-none text-left ${
                  isChecked
                    ? 'border-primary bg-surface-2 ring-1 ring-primary shadow-xs'
                    : 'border-line-input bg-surface hover:bg-surface-2/60'
                }`}
              >
                <div
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    isChecked
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-line-input bg-surface'
                  }`}
                  aria-hidden="true"
                >
                  {isChecked && (
                    <svg
                      className="w-3 h-3 stroke-current"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="font-sans text-sm font-medium text-ink">
                  {item}
                </span>
              </label>
            )
          })}
        </div>
        {errors.investmentInstruments && touched.investmentInstruments && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {errors.investmentInstruments}
          </p>
        )}
      </div>

      {/* Field 5: Attendance Confirmation */}
      <div className="flex flex-col">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-sans text-xs font-semibold tracking-[0.08em] text-ink uppercase">
            Attendance Confirmation <span className="text-danger" aria-hidden="true">*</span>
          </span>
          <span className="text-xs text-ink-muted">Will you attend?</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label
            tabIndex={0}
            role="radio"
            aria-checked={values.attending === 'yes'}
            onClick={() => handleAttendingChange('yes')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                handleAttendingChange('yes')
              }
            }}
            className={`min-h-tap flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer select-none text-left ${
              values.attending === 'yes'
                ? 'border-primary bg-surface-2 ring-1 ring-primary shadow-xs'
                : 'border-line-input bg-surface hover:bg-surface-2/60'
            }`}
          >
            <div
              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                values.attending === 'yes'
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-line-input bg-surface'
              }`}
              aria-hidden="true"
            >
              {values.attending === 'yes' && (
                <svg
                  className="w-3 h-3 stroke-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-bold text-ink">Yes</span>
              <span className="text-[11px] text-ink-muted">I will attend</span>
            </div>
          </label>

          <label
            tabIndex={0}
            role="radio"
            aria-checked={values.attending === 'no'}
            onClick={() => handleAttendingChange('no')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                handleAttendingChange('no')
              }
            }}
            className={`min-h-tap flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer select-none text-left ${
              values.attending === 'no'
                ? 'border-primary bg-surface-2 ring-1 ring-primary shadow-xs'
                : 'border-line-input bg-surface hover:bg-surface-2/60'
            }`}
          >
            <div
              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                values.attending === 'no'
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-line-input bg-surface'
              }`}
              aria-hidden="true"
            >
              {values.attending === 'no' && (
                <svg
                  className="w-3 h-3 stroke-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-bold text-ink">No</span>
              <span className="text-[11px] text-ink-muted">Unable to attend</span>
            </div>
          </label>
        </div>
        {errors.attending && touched.attending && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {errors.attending}
          </p>
        )}
      </div>

      {/* Turnstile Anti-Bot Verification Widget */}
      <div className="flex flex-col items-center pt-1">
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
            setTurnstileError('Failed to load anti-bot verification. Please reload the page.')
          }}
          resetTrigger={turnstileResetTrigger}
        />
        {turnstileError && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger text-center">
            {turnstileError}
          </p>
        )}
      </div>

      {/* Form-level Error Banner */}
      {formError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger flex flex-col gap-1.5 text-left"
        >
          <p className="font-semibold">{formError}</p>
          {contactWhatsapp && (
            <p className="text-ink-muted">
              Contact organizers via{' '}
              <a
                href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary underline underline-offset-2 hover:opacity-90"
              >
                WhatsApp Organizers
              </a>
            </p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-2 flex flex-col items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-tap flex w-full items-center justify-center gap-2 rounded-pill bg-primary px-8 font-sans text-base font-semibold py-2 text-center leading-tight tracking-[0.1em] text-balance uppercase text-on-primary shadow-card transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-14 md:text-lg cursor-pointer"
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
              <span>Processing…</span>
            </>
          ) : values.attending === 'no' ? (
            'SUBMIT CONFIRMATION'
          ) : (
            'RSVP'
          )}
        </button>
        <p className="text-center text-xs text-ink-muted text-pretty">
          {values.attending === 'no'
            ? 'Your absence confirmation will be recorded in the system.'
            : 'Your QR ticket will be issued immediately once submitted.'}
        </p>
      </div>
    </form>
  )
}
