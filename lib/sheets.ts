import { JWT } from 'google-auth-library'
import { GoogleSpreadsheet } from 'google-spreadsheet'

import { formatPhoneForDisplay } from '@/lib/phone'
import { ticketNumber } from '@/lib/token'

export const SHEET_TAB_PESERTA = 'Peserta'

export const PESERTA_HEADERS = [
  'No Tiket',
  'Name',
  'WhatsApp',
  'Community',
  'Investment Interest',
  'RSVP',
  'Check-in',
] as const

export type PesertaHeader = (typeof PESERTA_HEADERS)[number]

export type SheetRegistrationInput = {
  token?: string
  ticketNumber?: string
  fullName: string
  phone: string
  email?: string | null
  notes?: string | null
  community?: string | null
  investmentInterests?: string[] | null
  attending?: boolean | null
  status?: 'confirmed' | 'waitlist' | 'cancelled' | string
  createdAt?: Date | string
  checkedInAt?: Date | string | null
  checkedInBy?: string | null
}

export function mapStatusToIndonesian(status: SheetRegistrationInput['status']): string {
  switch (status) {
    case 'confirmed':
      return 'Terdaftar'
    case 'waitlist':
      return 'Waiting List'
    case 'cancelled':
      return 'Batal'
    default:
      return status ?? ''
  }
}

/**
 * Formats community code/label for Google Sheets display.
 */
export function formatCommunityForSheet(community?: string | null): string {
  if (!community) return ''
  if (community === 'club_79' || community === 'Club 79') return 'Club 79'
  if (community === 'womenpreneur_hipmi_jateng' || community === 'Womenpreneur Hipmi Jateng') {
    return 'Womenpreneur Hipmi Jateng'
  }
  return community
}

/**
 * Formats investment interests array as capitalized comma-separated string (e.g. "Gold, Property").
 */
export function formatInvestmentInterestsForSheet(interests?: string[] | null): string {
  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    return ''
  }

  const labelMap: Record<string, string> = {
    gold: 'Gold',
    deposit: 'Deposito',
    deposito: 'Deposito',
    stocks: 'Stocks',
    property: 'Property',
  }

  return interests
    .map((item) => {
      const lower = item.toLowerCase().trim()
      return labelMap[lower] ?? (item.charAt(0).toUpperCase() + item.slice(1))
    })
    .join(', ')
}

/**
 * Ensures escaped newlines from environment variables are converted to actual newlines.
 * Prevents "error:1E08010C:DECODER routines" with PEM private keys.
 */
export function normalizePrivateKey(rawKey: string): string {
  return rawKey.replace(/\\n/g, '\n')
}

/**
 * Extracts clean Google Spreadsheet ID from either a raw ID string or a full Google Sheets URL.
 */
export function extractSpreadsheetId(idOrUrl: string): string {
  const match = idOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : idOrUrl.trim()
}

/**
 * Returns true if all required Google Sheets credentials are provided in env.
 */
export function isSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEET_ID,
  )
}

/**
 * Transforms a registration DB entity/input into the 7-column format
 * specified for Tab 'Peserta' (No Tiket, Name, WhatsApp, Community, Investment Interest, RSVP, Check-in).
 */
export function formatRegistrationForSheet(
  input: SheetRegistrationInput,
): Record<PesertaHeader, string> {
  const isAttending = input.attending !== false
  const isCheckedIn = Boolean(input.checkedInAt)
  const displayTicket = input.ticketNumber
    ? input.ticketNumber
    : input.token
      ? ticketNumber(input.token)
      : ''

  return {
    'No Tiket': displayTicket,
    'Name': input.fullName,
    'WhatsApp': formatPhoneForDisplay(input.phone),
    'Community': formatCommunityForSheet(input.community),
    'Investment Interest': formatInvestmentInterestsForSheet(input.investmentInterests),
    'RSVP': isAttending ? 'Yes' : 'No',
    'Check-in': isCheckedIn ? 'Yes' : 'No',
  }
}

/**
 * Instantiates and loads metadata for the Google Spreadsheet document using
 * a Service Account JWT client.
 */
export async function getSpreadsheetDoc(): Promise<GoogleSpreadsheet> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY
  const sheetIdRaw = process.env.GOOGLE_SHEET_ID

  if (!email || !privateKeyRaw || !sheetIdRaw) {
    throw new Error(
      'Google Sheets credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID.',
    )
  }

  const sheetId = extractSpreadsheetId(sheetIdRaw)

  const auth = new JWT({
    email,
    key: normalizePrivateKey(privateKeyRaw),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const doc = new GoogleSpreadsheet(sheetId, auth)
  await doc.loadInfo()
  return doc
}

/**
 * Appends a new registration row to the 'Peserta' worksheet in Google Sheets.
 * Returns the 1-indexed row number (`sheetRow`) where it was inserted.
 */
export async function appendRegistration(
  input: SheetRegistrationInput,
  docInstance?: GoogleSpreadsheet,
): Promise<{ sheetRow: number }> {
  const doc = docInstance ?? (await sheets.getSpreadsheetDoc())
  const sheet = doc.sheetsByTitle[SHEET_TAB_PESERTA]

  if (!sheet) {
    throw new Error(`Tab "${SHEET_TAB_PESERTA}" tidak ditemukan di spreadsheet.`)
  }

  const rowValues = formatRegistrationForSheet(input)
  const row = await sheet.addRow(rowValues)

  return {
    sheetRow: row.rowNumber,
  }
}

export type UpdateCheckInInput = {
  ticketNumber?: string
  sheetRow?: number | null
  fullName?: string | null
  phone?: string | null
  checkedInAt?: Date | string | null
  checkedInBy?: string | null
  checkInValue?: 'Yes' | 'No'
}

/**
 * Updates column 'Check-in' in Tab 'Peserta' for a participant.
 * Sets to 'Yes' when checked in, or 'No' when check-in is reversed.
 * Uses fast path if sheetRow is known and valid, with fallback search by WhatsApp, Name, or ticket number.
 */
export async function updateParticipantCheckIn(
  input: UpdateCheckInInput,
  docInstance?: GoogleSpreadsheet,
): Promise<{ updated: boolean; sheetRow?: number }> {
  const doc = docInstance ?? (await sheets.getSpreadsheetDoc())
  const sheet = doc.sheetsByTitle[SHEET_TAB_PESERTA]

  if (!sheet) {
    console.warn(`[Sheets Mirror] Tab "${SHEET_TAB_PESERTA}" tidak ditemukan di spreadsheet.`)
    return { updated: false }
  }

  const checkInVal: 'Yes' | 'No' = input.checkInValue ?? (input.checkedInAt ? 'Yes' : 'No')
  const cleanPhone = input.phone ? input.phone.replace(/\D/g, '') : ''

  // 1. Fast path: if sheetRow is known and points to a data row (>= 2)
  if (input.sheetRow && input.sheetRow >= 2) {
    try {
      const rows = await sheet.getRows({ offset: input.sheetRow - 2, limit: 1 })
      const targetRow = rows[0]
      if (targetRow) {
        targetRow.set('Check-in', checkInVal)
        await targetRow.save()
        return { updated: true, sheetRow: input.sheetRow }
      }
    } catch (err) {
      console.warn(`[Sheets Mirror] Gagal update via offset baris ${input.sheetRow}:`, err)
    }
  }

  // 2. Fallback: Search rows by WhatsApp, Name, or No Tiket
  try {
    const allRows = await sheet.getRows()
    const matched = allRows.find((r) => {
      if (input.phone) {
        const rowPhone = String(r.get('WhatsApp') ?? '').replace(/\D/g, '')
        if (rowPhone && cleanPhone && (rowPhone.includes(cleanPhone) || cleanPhone.includes(rowPhone))) {
          return true
        }
      }
      if (input.fullName && r.get('Name') === input.fullName) {
        return true
      }
      if (
        input.ticketNumber &&
        (r.get('No Tiket') === input.ticketNumber || r.get('No. Tiket') === input.ticketNumber)
      ) {
        return true
      }
      return false
    })

    if (matched) {
      matched.set('Check-in', checkInVal)
      await matched.save()
      return { updated: true, sheetRow: matched.rowNumber }
    }
  } catch (err) {
    console.warn('[Sheets Mirror] Gagal mencari baris peserta di spreadsheet:', err)
  }

  return { updated: false }
}

export type RecordCheckInSheetInput = {
  ticketNumber: string
  fullName?: string | null
  phone?: string | null
  sheetRow?: number | null
  checkedInAt?: Date | string | null
  checkedInBy?: string | null
  result: string
  mode?: 'online' | 'offline'
  checkInValue?: 'Yes' | 'No'
}

/**
 * Best-effort mirror helper for check-ins:
 * - Updates column 'Check-in' in Tab 'Peserta' to 'Yes' if check-in was successful ('ok')
 * - Catches any internal error so calling handler is never interrupted
 */
export async function recordCheckInToSheet(
  input: RecordCheckInSheetInput,
  docInstance?: GoogleSpreadsheet,
): Promise<void> {
  if (!isSheetsConfigured()) {
    return
  }

  // Only Tab 'Peserta' exists now. Update cell in 'Peserta' when check-in succeeded ('ok')
  if (input.result === 'ok') {
    try {
      const doc = docInstance ?? (await sheets.getSpreadsheetDoc())
      const timestamp = input.checkedInAt ?? new Date()

      await sheets.updateParticipantCheckIn(
        {
          ticketNumber: input.ticketNumber,
          fullName: input.fullName,
          phone: input.phone,
          sheetRow: input.sheetRow,
          checkedInAt: timestamp,
          checkedInBy: input.checkedInBy,
          checkInValue: input.checkInValue ?? 'Yes',
        },
        doc,
      )
    } catch (err) {
      console.warn(
        `[Sheets Mirror] Gagal memperbarui sel check-in peserta (${input.ticketNumber}):`,
        err,
      )
    }
  }
}

export const sheets = {
  appendRegistration,
  formatRegistrationForSheet,
  formatCommunityForSheet,
  formatInvestmentInterestsForSheet,
  getSpreadsheetDoc,
  isSheetsConfigured,
  normalizePrivateKey,
  extractSpreadsheetId,
  mapStatusToIndonesian,
  updateParticipantCheckIn,
  recordCheckInToSheet,
}
