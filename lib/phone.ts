const COUNTRY_CODE = '62'

// Matches the registrations_phone_format constraint, narrowed to mobile prefixes:
// a WhatsApp ticket link is useless on a landline.
const NORMALISED_PATTERN = /^628\d{7,12}$/

export class InvalidPhoneNumberError extends Error {
  constructor(input: string) {
    super(`Not a valid Indonesian mobile number: ${input}`)
    this.name = 'InvalidPhoneNumberError'
  }
}

/**
 * Converts any accepted input form to E.164 without the plus sign.
 * This value is the deduplication key for registrations, so every variant a
 * participant might type has to collapse to the same string.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')

  let normalised: string
  if (digits.startsWith(COUNTRY_CODE)) {
    normalised = digits
  } else if (digits.startsWith('0')) {
    normalised = COUNTRY_CODE + digits.slice(1)
  } else if (digits.startsWith('8')) {
    normalised = COUNTRY_CODE + digits
  } else {
    throw new InvalidPhoneNumberError(input)
  }

  if (!NORMALISED_PATTERN.test(normalised)) {
    throw new InvalidPhoneNumberError(input)
  }

  return normalised
}

export function isValidPhone(input: string): boolean {
  try {
    normalizePhone(input)
    return true
  } catch {
    return false
  }
}

/** Renders a stored number back into the local form participants recognise. */
export function formatPhoneForDisplay(phone: string): string {
  const local = phone.startsWith(COUNTRY_CODE) ? `0${phone.slice(COUNTRY_CODE.length)}` : phone
  const groups = [local.slice(0, 4), local.slice(4, 8), local.slice(8)]
  return groups.filter(Boolean).join('-')
}
