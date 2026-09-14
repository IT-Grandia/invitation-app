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

  const toEnglishError = (message: string): string => {
    switch (message) {
      case 'Nama lengkap wajib diisi.':
        return 'Full name is required.'
      case 'Nama minimal 3 karakter.':
        return 'Name must be at least 3 characters.'
      case 'Nama maksimal 80 karakter.':
        return 'Name must be at most 80 characters.'
      case 'Nomor WhatsApp wajib diisi.':
        return 'WhatsApp number is required.'
      case 'Nomor WhatsApp tidak valid. Contoh: 08123456789':
        return 'Invalid WhatsApp number. Example: 08123456789'
      case 'Pilih minimal 1 komunitas.':
      case 'Pilih salah satu komunitas.':
        return 'Please select 1 community.'
      case 'Pilih minimal 1 instrumen investasi.':
        return 'Please select at least 1 investment instrument.'
      case 'Pilih maksimal 2 instrumen investasi.':
        return 'You can select a maximum of 2 investment instruments.'
      case 'Pilih konfirmasi kehadiran Anda (Yes atau No).':
        return 'Please confirm your attendance (Yes or No).'
      case 'Centang persetujuan untuk melanjutkan.':
        return 'Please accept the consent to continue.'
      default:
        return message
    }
  }

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

        if (errorCode === 'PHONE_ALREADY_REGISTERED') {
          setFormError(
            errorMessage ||
              'This phone number is already registered. Check your WhatsApp for your ticket link, or contact the organizers.',
          )
        } else if (errorCode === 'EVENT_FULL') {
          setFormError(
            errorMessage ||
              'Event quota is currently full. Please contact organizers for the waitlist.',
          )
        } else if (errorCode === 'REGISTRATION_CLOSED') {
          setFormError(errorMessage || 'Registration is currently closed.')
        } else if (errorCode === 'TURNSTILE_FAILED') {
          setTurnstileToken('')
          setTurnstileResetTrigger((prev) => prev + 1)
          setFormError(errorMessage || 'Anti-bot verification failed. Please reload the page.')
        } else {
          setFormError(
            errorMessage ||
              'System issue encountered. Please try again or contact organizers.',
          )
        }
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Important Notes Callout Banner */}
      <div className="rounded-[12px] border border-[#DDD6C5] bg-[#F2EDE1]/90 p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4E644D]/15 text-[#4E644D]">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div className="space-y-1.5 text-xs text-[#2E3B2E]">
            <span className="font-['Cinzel',serif] text-[10px] sm:text-[11px] font-bold tracking-[0.16em] text-[#4E644D] uppercase block">
              Important Notes
            </span>
            <ul className="space-y-1 text-xs text-[#2E3B2E] font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#4E644D] font-bold select-none">•</span>
                <span>This invitation is only for 1 padel player.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4E644D] font-bold select-none">•</span>
                <span>You are allowed to bring a supporter.</span>
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
        <label htmlFor="fullName" className="text-xs sm:text-sm font-semibold text-[#4E644D] mb-1.5">
          Full Name <span className="text-[#9E2A2B]" aria-hidden="true">*</span>
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

      {/* Field 2: WhatsApp Number */}
      <div className="flex flex-col">
        <label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-[#4E644D] mb-1.5">
          WhatsApp Number <span className="text-[#9E2A2B]" aria-hidden="true">*</span>
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

      {/* Field 3: Community (Club 79 & Womenpreneur Hipmi Jateng) */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs sm:text-sm font-semibold text-[#4E644D]">
            Community <span className="text-[#9E2A2B]" aria-hidden="true">*</span>
          </label>
          <span className="text-[11px] text-[#7F836A]">Select your community</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {COMMUNITY_OPTIONS.map((option) => {
            const isChecked = values.community === option
            return (
              <label
                key={option}
                onClick={() => handleCommunitySelect(option)}
                className={`flex items-center gap-3 p-3 rounded-[8px] border transition-all cursor-pointer select-none text-left ${
                  isChecked
                    ? 'bg-[#FAF7F0] border-[#4E644D] shadow-xs ring-1 ring-[#4E644D]'
                    : 'bg-white border-[#D6D1C2] hover:border-[#4E644D]/50 hover:bg-[#FAF9F5]'
                }`}
              >
                <div
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                    isChecked
                      ? 'border-[#4E644D] bg-[#4E644D] text-white'
                      : 'border-[#B8AF9C] bg-white'
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
                <span className="text-xs sm:text-sm font-medium text-[#243024]">
                  {option}
                </span>
              </label>
            )
          })}
        </div>
        {errors.community && touched.community && (
          <p role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B]">
            {errors.community}
          </p>
        )}
      </div>

      {/* Field 4: Investment Instruments You're Most Interested in (max 2) */}
      <div className="flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1.5 gap-0.5">
          <label className="text-xs sm:text-sm font-semibold text-[#4E644D]">
            Investment Instruments <span className="text-[#9E2A2B]" aria-hidden="true">*</span>
          </label>
          <span className="text-[11px] font-normal text-[#7F836A]">
            You&apos;re Most Interested in (min 1, max 2)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {INVESTMENT_OPTIONS.map((item) => {
            const isChecked = values.investmentInstruments.includes(item)
            return (
              <label
                key={item}
                onClick={() => handleInvestmentToggle(item)}
                className={`flex items-center gap-3 p-3 rounded-[8px] border transition-all cursor-pointer select-none text-left ${
                  isChecked
                    ? 'bg-[#FAF7F0] border-[#4E644D] shadow-xs ring-1 ring-[#4E644D]'
                    : 'bg-white border-[#D6D1C2] hover:border-[#4E644D]/50 hover:bg-[#FAF9F5]'
                }`}
              >
                <div
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                    isChecked
                      ? 'border-[#4E644D] bg-[#4E644D] text-white'
                      : 'border-[#B8AF9C] bg-white'
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
                <span className="text-xs sm:text-sm font-medium text-[#243024]">
                  {item}
                </span>
              </label>
            )
          })}
        </div>
        {errors.investmentInstruments && touched.investmentInstruments && (
          <p role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B]">
            {errors.investmentInstruments}
          </p>
        )}
      </div>

      {/* Field 5: Will you be attending the event? (Yes / No) */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs sm:text-sm font-semibold text-[#4E644D]">
            Will you be attending the event? <span className="text-[#9E2A2B]" aria-hidden="true">*</span>
          </label>
          <span className="text-[11px] text-[#7F836A]">Attendance confirmation</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label
            onClick={() => handleAttendingChange('yes')}
            className={`flex items-center gap-3 p-3 rounded-[8px] border transition-all cursor-pointer select-none text-left ${
              values.attending === 'yes'
                ? 'bg-[#FAF7F0] border-[#4E644D] shadow-xs ring-1 ring-[#4E644D]'
                : 'bg-white border-[#D6D1C2] hover:border-[#4E644D]/50 hover:bg-[#FAF9F5]'
            }`}
          >
            <div
              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                values.attending === 'yes'
                  ? 'border-[#4E644D] bg-[#4E644D] text-white'
                  : 'border-[#B8AF9C] bg-white'
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
              <span className="text-xs sm:text-sm font-bold text-[#243024]">Yes</span>
              <span className="text-[10.5px] text-[#7F836A]">I will attend</span>
            </div>
          </label>

          <label
            onClick={() => handleAttendingChange('no')}
            className={`flex items-center gap-3 p-3 rounded-[8px] border transition-all cursor-pointer select-none text-left ${
              values.attending === 'no'
                ? 'bg-[#FAF7F0] border-[#4E644D] shadow-xs ring-1 ring-[#4E644D]'
                : 'bg-white border-[#D6D1C2] hover:border-[#4E644D]/50 hover:bg-[#FAF9F5]'
            }`}
          >
            <div
              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                values.attending === 'no'
                  ? 'border-[#4E644D] bg-[#4E644D] text-white'
                  : 'border-[#B8AF9C] bg-white'
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
              <span className="text-xs sm:text-sm font-bold text-[#243024]">No</span>
              <span className="text-[10.5px] text-[#7F836A]">Unable to attend</span>
            </div>
          </label>
        </div>
        {errors.attending && touched.attending && (
          <p role="alert" className="mt-1 text-xs font-medium text-[#9E2A2B]">
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
              Contact organizers via{' '}
              <a
                href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="underline font-bold text-[#4E644D]"
              >
                WhatsApp Organizers
              </a>
            </p>
          )}
        </div>
      )}

      {/* Submit Button: Pill-shaped RSVP button in secondary #4E644D */}
      <div className="mt-2">
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
              <span>Processing...</span>
            </>
          ) : values.attending === 'no' ? (
            'SUBMIT CONFIRMATION'
          ) : (
            'RSVP'
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-[#4E644D]/75">
          {values.attending === 'no'
            ? 'Your absence confirmation will be recorded in the system.'
            : 'Your QR ticket will be issued immediately once submitted.'}
        </p>
      </div>
    </form>
  )
}
