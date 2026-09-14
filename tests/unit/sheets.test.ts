import type { GoogleSpreadsheet } from 'google-spreadsheet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  appendRegistration,
  extractSpreadsheetId,
  formatCommunityForSheet,
  formatInvestmentInterestsForSheet,
  formatRegistrationForSheet,
  getSpreadsheetDoc,
  isSheetsConfigured,
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
    community: 'club_79',
    investmentInterests: ['gold', 'property'],
    attending: true,
    createdAt: '2026-09-20T08:30:00.000Z',
    checkedInAt: '2026-09-26T01:15:00.000Z',
    checkedInBy: 'Petugas A',
  }

  it('contains exactly the 7 required headers: No Tiket, Name, WhatsApp, Community, Investment Interest, RSVP, Check-in', () => {
    const row = formatRegistrationForSheet(sampleInput)
    const keys = Object.keys(row)

    expect(keys).toEqual(PESERTA_HEADERS)
    expect(keys).toEqual([
      'No Tiket',
      'Name',
      'WhatsApp',
      'Community',
      'Investment Interest',
      'RSVP',
      'Check-in',
    ])
    expect(keys).toHaveLength(7)
  })

  it('formats No Tiket as uppercase 8-character string and never leaks full token or private data in any sheet cell', () => {
    const row = formatRegistrationForSheet(sampleInput)

    expect(row['No Tiket']).toBe('ABCDEF12')
    expect(row['No Tiket']).toHaveLength(8)

    const allValues = Object.values(row).join(' ')
    expect(allValues).not.toContain('abcdef123456ghijk-7890xy')
    expect(allValues).not.toContain('Alergi kacang')
    expect(allValues).not.toContain('budi@example.com')
  })

  it('formats Indonesian mobile phone with hyphens for display', () => {
    const row = formatRegistrationForSheet(sampleInput)
    expect(row.WhatsApp).toBe('0812-3456-789')
  })

  it('formats Community correctly for Club 79 and Womenpreneur Hipmi Jateng', () => {
    expect(formatCommunityForSheet('club_79')).toBe('Club 79')
    expect(formatCommunityForSheet('Club 79')).toBe('Club 79')
    expect(formatCommunityForSheet('womenpreneur_hipmi_jateng')).toBe('Womenpreneur Hipmi Jateng')
    expect(formatCommunityForSheet('Womenpreneur Hipmi Jateng')).toBe('Womenpreneur Hipmi Jateng')
    expect(formatCommunityForSheet(null)).toBe('')
    expect(formatCommunityForSheet(undefined)).toBe('')

    const row = formatRegistrationForSheet({
      ...sampleInput,
      community: 'womenpreneur_hipmi_jateng',
    })
    expect(row.Community).toBe('Womenpreneur Hipmi Jateng')
  })

  it('formats Investment Interest as comma-separated capitalized labels', () => {
    expect(formatInvestmentInterestsForSheet(['gold'])).toBe('Gold')
    expect(formatInvestmentInterestsForSheet(['gold', 'property'])).toBe('Gold, Property')
    expect(formatInvestmentInterestsForSheet(['deposit', 'stocks'])).toBe('Deposito, Stocks')
    expect(formatInvestmentInterestsForSheet(['deposito'])).toBe('Deposito')
    expect(formatInvestmentInterestsForSheet([])).toBe('')
    expect(formatInvestmentInterestsForSheet(null)).toBe('')
    expect(formatInvestmentInterestsForSheet(undefined)).toBe('')

    const row = formatRegistrationForSheet({
      ...sampleInput,
      investmentInterests: ['deposit', 'stocks'],
    })
    expect(row['Investment Interest']).toBe('Deposito, Stocks')
  })

  it('formats RSVP as Yes when attending is true and No when false', () => {
    const attendingRow = formatRegistrationForSheet({ ...sampleInput, attending: true })
    expect(attendingRow.RSVP).toBe('Yes')

    const notAttendingRow = formatRegistrationForSheet({ ...sampleInput, attending: false })
    expect(notAttendingRow.RSVP).toBe('No')
  })

  it('formats Check-in as Yes when checkedInAt is present, and No when null/undefined', () => {
    const checkedInRow = formatRegistrationForSheet({
      ...sampleInput,
      checkedInAt: '2026-09-26T01:15:00.000Z',
    })
    expect(checkedInRow['Check-in']).toBe('Yes')

    const notCheckedInRow = formatRegistrationForSheet({
      ...sampleInput,
      checkedInAt: null,
    })
    expect(notCheckedInRow['Check-in']).toBe('No')
  })

  it('handles optional fields when null or undefined', () => {
    const minimalInput: SheetRegistrationInput = {
      fullName: 'Siti Rahma',
      phone: '6285712345678',
      community: null,
      investmentInterests: null,
      attending: null,
      checkedInAt: null,
    }

    const row = formatRegistrationForSheet(minimalInput)

    expect(row['No Tiket']).toBe('')
    expect(row.Name).toBe('Siti Rahma')
    expect(row.WhatsApp).toBe('0857-1234-5678')
    expect(row.Community).toBe('')
    expect(row['Investment Interest']).toBe('')
    expect(row.RSVP).toBe('Yes')
    expect(row['Check-in']).toBe('No')
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

describe('extractSpreadsheetId', () => {
  it('returns plain spreadsheet ID as-is when trimmed', () => {
    expect(extractSpreadsheetId('1bpV_9m4dKIdh8dmXN5mwtdVTzLcBPngEITBEryprixI')).toBe(
      '1bpV_9m4dKIdh8dmXN5mwtdVTzLcBPngEITBEryprixI',
    )
    expect(extractSpreadsheetId('  1bpV_9m4dKIdh8dmXN5mwtdVTzLcBPngEITBEryprixI  ')).toBe(
      '1bpV_9m4dKIdh8dmXN5mwtdVTzLcBPngEITBEryprixI',
    )
  })

  it('extracts ID correctly from full Google Sheets URLs', () => {
    const fullUrl =
      'https://docs.google.com/spreadsheets/d/1bpV_9m4dKIdh8dmXN5mwtdVTzLcBPngEITBEryprixI/edit?hl=id#gid=0'
    expect(extractSpreadsheetId(fullUrl)).toBe(
      '1bpV_9m4dKIdh8dmXN5mwtdVTzLcBPngEITBEryprixI',
    )
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
      community: 'club_79',
      investmentInterests: ['gold', 'deposit'],
      attending: true,
      status: 'confirmed',
      createdAt: '2026-09-20T08:00:00.000Z',
    }

    const result = await appendRegistration(input)

    expect(result).toEqual({ sheetRow: 42 })
    expect(mockAddRow).toHaveBeenCalledTimes(1)
    expect(mockAddRow).toHaveBeenCalledWith({
      'No Tiket': '12345678',
      Name: 'Ahmad Dahlan',
      WhatsApp: '0812-9876-5432',
      Community: 'Club 79',
      'Investment Interest': 'Gold, Deposito',
      RSVP: 'Yes',
      'Check-in': 'No',
    })
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
