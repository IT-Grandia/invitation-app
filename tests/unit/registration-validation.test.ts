import { describe, expect, it } from 'vitest'

import {
  attendingApiSchema,
  attendingSchema,
  communityApiSchema,
  consentSchema,
  emailSchema,
  fullNameSchema,
  investmentInstrumentsSchema,
  investmentInterestsApiSchema,
  notesSchema,
  phoneSchema,
  registerApiSchema,
  registrationFormSchema,
  revisedRegistrationFormSchema,
  singleCommunitySchema,
} from '@/lib/validation/registration'

describe('fullNameSchema', () => {
  it('accepts valid names between 3 and 80 characters', () => {
    expect(fullNameSchema.safeParse('Budi Santoso').data).toBe('Budi Santoso')
    expect(fullNameSchema.safeParse('   Budi Santoso   ').data).toBe('Budi Santoso')
    expect(fullNameSchema.safeParse('Ari').data).toBe('Ari')
    expect(fullNameSchema.safeParse('A'.repeat(80)).data).toBe('A'.repeat(80))
  })

  it('rejects names shorter than 3 characters', () => {
    const res = fullNameSchema.safeParse('Ab')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Nama minimal 3 karakter.')
    }
  })

  it('rejects names with only whitespace', () => {
    const res = fullNameSchema.safeParse('     ')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Nama minimal 3 karakter.')
    }
  })

  it('rejects names longer than 80 characters', () => {
    const res = fullNameSchema.safeParse('A'.repeat(81))
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Nama maksimal 80 karakter.')
    }
  })

  it('rejects missing or undefined names', () => {
    const res = fullNameSchema.safeParse(undefined)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Nama lengkap wajib diisi.')
    }
  })
})

describe('phoneSchema', () => {
  it.each([
    '08123456789',
    '+628123456789',
    '628123456789',
    '8123456789',
    '0812-3456-789',
    '0812 3456 789',
    '  08123456789  ',
    '(0812) 3456789',
  ])('accepts valid Indonesian mobile number: %s', (input) => {
    const res = phoneSchema.safeParse(input)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toBe(input.trim())
    }
  })

  it.each([
    ['0217654321', 'landline, not a mobile number'],
    ['123', 'too short'],
    ['08123', 'too short'],
    ['+1234567890', 'non-Indonesian number'],
    ['628123456789012345', 'too long'],
    ['bukan nomor', 'non-numeric'],
    ['', 'empty string'],
  ])('rejects invalid phone number: %s (%s)', (input) => {
    const res = phoneSchema.safeParse(input)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe(
        'Nomor WhatsApp tidak valid. Contoh: 08123456789',
      )
    }
  })

  it('rejects undefined phone number', () => {
    const res = phoneSchema.safeParse(undefined)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Nomor WhatsApp wajib diisi.')
    }
  })
})

describe('emailSchema', () => {
  it('accepts valid email format', () => {
    const res = emailSchema.safeParse('budi@example.com')
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toBe('budi@example.com')
    }
  })

  it.each([
    ['', null],
    ['   ', null],
    [null, null],
    [undefined, null],
  ])('coerces empty/null/undefined %s to null', (input, expected) => {
    const res = emailSchema.safeParse(input)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toBe(expected)
    }
  })

  it.each(['invalid-email', '@example.com', 'budi@', 'budi@domain'])('rejects invalid email: %s', (input) => {
    const res = emailSchema.safeParse(input)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Format email tidak valid.')
    }
  })
})

describe('notesSchema', () => {
  it('accepts notes up to 300 characters', () => {
    const shortNotes = 'Baru pertama kali ikut'
    expect(notesSchema.safeParse(shortNotes).data).toBe(shortNotes)

    const maxNotes = 'a'.repeat(300)
    expect(notesSchema.safeParse(maxNotes).data).toBe(maxNotes)
  })

  it.each([
    ['', null],
    ['   ', null],
    [null, null],
    [undefined, null],
  ])('coerces empty/null/undefined %s to null', (input, expected) => {
    const res = notesSchema.safeParse(input)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toBe(expected)
    }
  })

  it('rejects notes exceeding 300 characters', () => {
    const res = notesSchema.safeParse('a'.repeat(301))
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Catatan maksimal 300 karakter.')
    }
  })
})

describe('consentSchema', () => {
  it('accepts true', () => {
    expect(consentSchema.safeParse(true).success).toBe(true)
  })

  it('rejects false', () => {
    const res = consentSchema.safeParse(false)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Centang persetujuan untuk melanjutkan.')
    }
  })

  it('rejects undefined', () => {
    const res = consentSchema.safeParse(undefined)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Centang persetujuan untuk melanjutkan.')
    }
  })
})

describe('registrationFormSchema', () => {
  it('validates a complete and correct form input', () => {
    const rawInput = {
      fullName: '  Budi Santoso  ',
      phone: '08123456789',
      email: 'budi@example.com',
      notes: 'Datang bersama rekan',
      consent: true,
    }

    const res = registrationFormSchema.safeParse(rawInput)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toEqual({
        fullName: 'Budi Santoso',
        phone: '08123456789',
        email: 'budi@example.com',
        notes: 'Datang bersama rekan',
        consent: true,
      })
    }
  })

  it('validates minimal form input with optional fields omitted or empty', () => {
    const rawInput = {
      fullName: 'Siti Aminah',
      phone: '+628123456789',
      email: '',
      notes: '',
      consent: true,
    }

    const res = registrationFormSchema.safeParse(rawInput)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toEqual({
        fullName: 'Siti Aminah',
        phone: '+628123456789',
        email: null,
        notes: null,
        consent: true,
      })
    }
  })

  it('fails when required fields are invalid', () => {
    const rawInput = {
      fullName: 'Al',
      phone: '0211234567',
      email: 'not-an-email',
      consent: false,
    }

    const res = registrationFormSchema.safeParse(rawInput)
    expect(res.success).toBe(false)
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors
      expect(fieldErrors.fullName).toContain('Nama minimal 3 karakter.')
      expect(fieldErrors.phone).toContain(
        'Nomor WhatsApp tidak valid. Contoh: 08123456789',
      )
      expect(fieldErrors.email).toContain('Format email tidak valid.')
      expect(fieldErrors.consent).toContain('Centang persetujuan untuk melanjutkan.')
    }
  })
})

describe('registerApiSchema', () => {
  it('validates a valid API submission with turnstileToken', () => {
    const apiPayload = {
      fullName: 'Budi Santoso',
      phone: '08123456789',
      email: 'budi@example.com',
      notes: 'Ready to play',
      consent: true,
      turnstileToken: '0.cf-turnstile-token-sample',
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.turnstileToken).toBe('0.cf-turnstile-token-sample')
      expect(res.data.fullName).toBe('Budi Santoso')
    }
  })

  it('rejects API submission missing turnstileToken', () => {
    const apiPayload = {
      fullName: 'Budi Santoso',
      phone: '08123456789',
      consent: true,
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(false)
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors
      expect(fieldErrors.turnstileToken).toContain(
        'Verifikasi anti-bot wajib diselesaikan.',
      )
    }
  })

  it('rejects API submission with empty turnstileToken', () => {
    const apiPayload = {
      fullName: 'Budi Santoso',
      phone: '08123456789',
      consent: true,
      turnstileToken: '   ',
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(false)
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors
      expect(fieldErrors.turnstileToken).toContain(
        'Verifikasi anti-bot wajib diselesaikan.',
      )
    }
  })

  it('rejects submission when honeypot field is filled by bot', () => {
    const apiPayload = {
      fullName: 'Bot User',
      phone: '08123456789',
      consent: true,
      turnstileToken: '0.sample',
      website: 'https://spam-bot.example.com',
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(false)
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors
      expect(fieldErrors.website).toContain('Spam terdeteksi.')
    }
  })

  it('allows submission when honeypot field is omitted or empty', () => {
    const apiPayload = {
      fullName: 'Budi Santoso',
      phone: '08123456789',
      consent: true,
      turnstileToken: '0.sample',
      website: '',
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(true)
  })

  it('validates submission with new survey fields (community, investment, attending)', () => {
    const apiPayload = {
      fullName: 'Budi Santoso',
      phone: '08123456789',
      consent: true,
      turnstileToken: '0.sample',
      community: 'Club 79',
      investmentInterests: ['Gold', 'Deposito'],
      attending: 'yes',
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.community).toBe('club_79')
      expect(res.data.investmentInterests).toEqual(['gold', 'deposit'])
      expect(res.data.attending).toBe(true)
    }
  })

  it('rejects API submission with more than 2 investment interests', () => {
    const apiPayload = {
      fullName: 'Budi Santoso',
      phone: '08123456789',
      consent: true,
      turnstileToken: '0.sample',
      investmentInterests: ['Gold', 'Deposito', 'Stocks'],
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(false)
    if (!res.success) {
      const errors = res.error.flatten().fieldErrors
      expect(errors.investmentInterests).toContain('Pilih maksimal 2 instrumen investasi.')
    }
  })

  it('rejects API submission with duplicate investment interests', () => {
    const apiPayload = {
      fullName: 'Budi Santoso',
      phone: '08123456789',
      consent: true,
      turnstileToken: '0.sample',
      investmentInterests: ['Gold', 'Gold'],
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(false)
  })

  it('rejects API submission when community is passed as an array (strictly max 1 choice)', () => {
    const apiPayload = {
      fullName: 'Budi Santoso',
      phone: '08123456789',
      consent: true,
      turnstileToken: '0.sample',
      community: ['Club 79', 'Womenpreneur Hipmi Jateng'],
    }

    const res = registerApiSchema.safeParse(apiPayload)
    expect(res.success).toBe(false)
  })
})

describe('singleCommunitySchema & communityApiSchema (max 1 pilihan)', () => {
  it('accepts valid single community choice', () => {
    expect(singleCommunitySchema.safeParse('Club 79').data).toBe('Club 79')
    expect(singleCommunitySchema.safeParse('Womenpreneur Hipmi Jateng').data).toBe(
      'Womenpreneur Hipmi Jateng',
    )
  })

  it('rejects invalid community string or array', () => {
    expect(singleCommunitySchema.safeParse('Komunitas Lain').success).toBe(false)
    expect(singleCommunitySchema.safeParse(['Club 79']).success).toBe(false)
  })

  it('communityApiSchema transforms label or code to canonical code', () => {
    expect(communityApiSchema.safeParse('Club 79').data).toBe('club_79')
    expect(communityApiSchema.safeParse('Womenpreneur Hipmi Jateng').data).toBe(
      'womenpreneur_hipmi_jateng',
    )
    expect(communityApiSchema.safeParse('club_79').data).toBe('club_79')
  })

  it('communityApiSchema rejects array (strictly max 1 choice)', () => {
    expect(communityApiSchema.safeParse(['club_79']).success).toBe(false)
  })
})

describe('investmentInstrumentsSchema & investmentInterestsApiSchema (min 1, max 2)', () => {
  it('accepts 1 or 2 valid instruments on client', () => {
    expect(investmentInstrumentsSchema.safeParse(['Gold']).data).toEqual(['Gold'])
    expect(investmentInstrumentsSchema.safeParse(['Gold', 'Stocks']).data).toEqual([
      'Gold',
      'Stocks',
    ])
    expect(investmentInstrumentsSchema.safeParse(['Deposito', 'Property']).data).toEqual([
      'Deposito',
      'Property',
    ])
  })

  it('rejects 0 selected instruments on client', () => {
    const res = investmentInstrumentsSchema.safeParse([])
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Pilih minimal 1 instrumen investasi.')
    }
  })

  it('rejects more than 2 instruments on client', () => {
    const res = investmentInstrumentsSchema.safeParse(['Gold', 'Deposito', 'Stocks'])
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Pilih maksimal 2 instrumen investasi.')
    }
  })

  it('rejects duplicate instruments on client', () => {
    const res = investmentInstrumentsSchema.safeParse(['Gold', 'Gold'])
    expect(res.success).toBe(false)
  })

  it('investmentInterestsApiSchema transforms and enforces min 1, max 2', () => {
    const res1 = investmentInterestsApiSchema.safeParse(['Gold'])
    expect(res1.success).toBe(true)
    if (res1.success) {
      expect(res1.data).toEqual(['gold'])
    }

    const res2 = investmentInterestsApiSchema.safeParse(['Deposito', 'Stocks'])
    expect(res2.success).toBe(true)
    if (res2.success) {
      expect(res2.data).toEqual(['deposit', 'stocks'])
    }

    expect(investmentInterestsApiSchema.safeParse([]).success).toBe(false)
    expect(
      investmentInterestsApiSchema.safeParse(['Gold', 'Deposito', 'Stocks']).success,
    ).toBe(false)
    expect(investmentInterestsApiSchema.safeParse(['Gold', 'Gold']).success).toBe(false)
  })
})

describe('attendingSchema & attendingApiSchema (max 1 pilihan)', () => {
  it('accepts yes and no on client', () => {
    expect(attendingSchema.safeParse('yes').data).toBe('yes')
    expect(attendingSchema.safeParse('no').data).toBe('no')
  })

  it('rejects invalid or empty values on client', () => {
    expect(attendingSchema.safeParse('maybe').success).toBe(false)
    expect(attendingSchema.safeParse('').success).toBe(false)
    expect(attendingSchema.safeParse(undefined).success).toBe(false)
  })

  it('attendingApiSchema accepts boolean or string and transforms to boolean', () => {
    expect(attendingApiSchema.safeParse(true).data).toBe(true)
    expect(attendingApiSchema.safeParse(false).data).toBe(false)
    expect(attendingApiSchema.safeParse('yes').data).toBe(true)
    expect(attendingApiSchema.safeParse('no').data).toBe(false)
  })

  it('attendingApiSchema rejects arrays (strictly max 1 choice)', () => {
    expect(attendingApiSchema.safeParse(['yes']).success).toBe(false)
    expect(attendingApiSchema.safeParse(['yes', 'no']).success).toBe(false)
  })
})

describe('revisedRegistrationFormSchema', () => {
  it('validates a complete revised form input with single community', () => {
    const rawInput = {
      fullName: 'Siti Rahmawati',
      phone: '081234567890',
      community: 'Club 79',
      investmentInstruments: ['Gold', 'Property'],
      attending: 'yes',
    }

    const res = revisedRegistrationFormSchema.safeParse(rawInput)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toEqual({
        fullName: 'Siti Rahmawati',
        phone: '081234567890',
        community: 'Club 79',
        investmentInstruments: ['Gold', 'Property'],
        attending: 'yes',
      })
    }
  })

  it('rejects missing or invalid fields in revised form', () => {
    const rawInput = {
      fullName: 'Al',
      phone: 'invalid-phone',
      community: '',
      investmentInstruments: ['Gold', 'Deposito', 'Stocks'],
      attending: '',
    }

    const res = revisedRegistrationFormSchema.safeParse(rawInput)
    expect(res.success).toBe(false)
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors
      expect(fieldErrors.fullName).toContain('Nama minimal 3 karakter.')
      expect(fieldErrors.phone).toContain(
        'Nomor WhatsApp tidak valid. Contoh: 08123456789',
      )
      expect(fieldErrors.community).toBeDefined()
      expect(fieldErrors.investmentInstruments).toContain(
        'Pilih maksimal 2 instrumen investasi.',
      )
      expect(fieldErrors.attending).toBeDefined()
    }
  })
})

