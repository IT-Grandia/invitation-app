import type { GoogleSpreadsheet } from 'google-spreadsheet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  appendRegistration,
  formatRegistrationForSheet,
  getSpreadsheetDoc,
  isSheetsConfigured,
  mapStatusToIndonesian,
  normalizePrivateKey,
  PESERTA_HEADERS,
  sheets,
  type SheetRegistrationInput,
} from '@/lib/sheets'

describe('formatRegistrationForSheet', () => {
  const sampleInput: SheetRegistrationInput = {
    token: 'abcdef123456ghijk-7890xy',
    fullName: 'Budi Santoso',
    phone: '628123456789',
    email: 'budi@example.com',
    notes: 'Alergi kacang',
    status: 'confirmed',
    createdAt: '2026-09-20T08:30:00.000Z',
    checkedInAt: '2026-09-26T01:15:00.000Z',
    checkedInBy: 'Petugas A',
  }

  it('contains exactly the 9 required headers from 03-DATA-MODEL.md', () => {
    const row = formatRegistrationForSheet(sampleInput)
    const keys = Object.keys(row)

    expect(keys).toEqual(PESERTA_HEADERS)
    expect(keys).toHaveLength(9)
  })

  it('formats ticket number as 8 uppercase characters and NEVER leaks full token', () => {
    const row = formatRegistrationForSheet(sampleInput)

    expect(row['No. Tiket']).toBe('ABCDEF12')
    expect(row['No. Tiket']).toHaveLength(8)

    // Ensure full secret token is nowhere in the sheet row values
    const allValues = Object.values(row).join(' ')
    expect(allValues).not.toContain('abcdef123456ghijk-7890xy')
  })

  it('formats Indonesian mobile phone with hyphens for display', () => {
    const row = formatRegistrationForSheet(sampleInput)
    expect(row.WhatsApp).toBe('0812-3456-789')
  })

  it('formats registration and check-in times in WIB', () => {
    const row = formatRegistrationForSheet(sampleInput)
    // 08:30 UTC = 15:30 WIB
    expect(row['Waktu Daftar']).toBe('20 Sep 2026, 15:30')
    // 01:15 UTC = 08:15 WIB
    expect(row['Waktu Check-in']).toBe('26 Sep 2026, 08:15')
  })

  it('maps DB statuses to Indonesian labels', () => {
    expect(mapStatusToIndonesian('confirmed')).toBe('Terdaftar')
    expect(mapStatusToIndonesian('waitlist')).toBe('Waiting List')
    expect(mapStatusToIndonesian('cancelled')).toBe('Batal')

    const confirmedRow = formatRegistrationForSheet({ ...sampleInput, status: 'confirmed' })
    expect(confirmedRow.Status).toBe('Terdaftar')

    const waitlistRow = formatRegistrationForSheet({ ...sampleInput, status: 'waitlist' })
    expect(waitlistRow.Status).toBe('Waiting List')

    const cancelledRow = formatRegistrationForSheet({ ...sampleInput, status: 'cancelled' })
    expect(cancelledRow.Status).toBe('Batal')
  })

  it('handles optional fields when null or undefined', () => {
    const minimalInput: SheetRegistrationInput = {
      token: 'abcdef123456ghijk-7890xy',
      fullName: 'Siti Rahma',
      phone: '6285712345678',
      email: null,
      notes: undefined,
      status: 'confirmed',
      createdAt: new Date('2026-09-20T08:30:00.000Z'),
      checkedInAt: null,
      checkedInBy: null,
    }

    const row = formatRegistrationForSheet(minimalInput)

    expect(row.Email).toBe('')
    expect(row.Catatan).toBe('')
    expect(row['Waktu Check-in']).toBe('')
    expect(row.Petugas).toBe('')
  })
})

describe('normalizePrivateKey', () => {
  it('converts literal "\\n" strings to actual newline characters', () => {
    const raw = '-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBg\\n-----END PRIVATE KEY-----'
    const normalized = normalizePrivateKey(raw)

    expect(normalized).toBe(
      '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----',
    )
    expect(normalized.includes('\\n')).toBe(false)
    expect(normalized.split('\n')).toHaveLength(3)
  })
})

describe('isSheetsConfigured', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns true when all 3 required env variables are present', () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'bot@serviceaccount.com'
    process.env.GOOGLE_PRIVATE_KEY = 'fake-key'
    process.env.GOOGLE_SHEET_ID = 'sheet-id-123'

    expect(isSheetsConfigured()).toBe(true)
  })

  it('returns false when any of the required variables is missing', () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    process.env.GOOGLE_PRIVATE_KEY = 'fake-key'
    process.env.GOOGLE_SHEET_ID = 'sheet-id-123'

    expect(isSheetsConfigured()).toBe(false)

    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'bot@serviceaccount.com'
    delete process.env.GOOGLE_PRIVATE_KEY
    expect(isSheetsConfigured()).toBe(false)

    process.env.GOOGLE_PRIVATE_KEY = 'fake-key'
    delete process.env.GOOGLE_SHEET_ID
    expect(isSheetsConfigured()).toBe(false)
  })
})

describe('getSpreadsheetDoc', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('throws an informative error if credentials are not configured', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    delete process.env.GOOGLE_PRIVATE_KEY
    delete process.env.GOOGLE_SHEET_ID

    await expect(getSpreadsheetDoc()).rejects.toThrow(
      /Google Sheets credentials not configured/,
    )
  })
})

describe('appendRegistration', () => {
  it('appends formatted row to "Peserta" sheet and returns row number', async () => {
    const mockAddRow = vi.fn().mockResolvedValue({ rowNumber: 42 })
    const mockSheet = { addRow: mockAddRow }

    vi.spyOn(sheets, 'getSpreadsheetDoc').mockResolvedValue({
      sheetsByTitle: {
        Peserta: mockSheet,
      },
    } as unknown as GoogleSpreadsheet)

    const input: SheetRegistrationInput = {
      token: '1234567890abcdefghijklmn',
      fullName: 'Ahmad Dahlan',
      phone: '6281298765432',
      email: 'ahmad@example.com',
      notes: null,
      status: 'confirmed',
      createdAt: '2026-09-20T08:00:00.000Z',
    }

    const result = await appendRegistration(input)

    expect(result).toEqual({ sheetRow: 42 })
    expect(mockAddRow).toHaveBeenCalledTimes(1)
    expect(mockAddRow).toHaveBeenCalledWith(
      expect.objectContaining({
        'No. Tiket': '12345678',
        'Nama Lengkap': 'Ahmad Dahlan',
        WhatsApp: '0812-9876-5432',
        Email: 'ahmad@example.com',
        Status: 'Terdaftar',
      }),
    )
  })

  it('throws an error if "Peserta" worksheet is missing', async () => {
    vi.spyOn(sheets, 'getSpreadsheetDoc').mockResolvedValue({
      sheetsByTitle: {},
    } as unknown as GoogleSpreadsheet)

    const input: SheetRegistrationInput = {
      token: '1234567890abcdefghijklmn',
      fullName: 'Ahmad Dahlan',
      phone: '6281298765432',
      status: 'confirmed',
      createdAt: '2026-09-20T08:00:00.000Z',
    }

    await expect(appendRegistration(input)).rejects.toThrow(
      'Tab "Peserta" tidak ditemukan di spreadsheet.',
    )
  })
})
