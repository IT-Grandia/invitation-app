import { JWT } from 'google-auth-library'
import { GoogleSpreadsheet } from 'google-spreadsheet'

import { formatWib } from '@/lib/datetime'
import { formatPhoneForDisplay } from '@/lib/phone'
import { ticketNumber } from '@/lib/token'

export const SHEET_TAB_PESERTA = 'Peserta'
export const SHEET_TAB_LOG_CHECKIN = 'Log Check-in'
export const SHEET_TAB_RINGKASAN = 'Ringkasan'

export const PESERTA_HEADERS = [
  'No. Tiket',
  'Nama Lengkap',
  'WhatsApp',
  'Email',
  'Status',
  'Waktu Daftar',
  'Waktu Check-in',
  'Petugas',
  'Catatan',
] as const

export type PesertaHeader = (typeof PESERTA_HEADERS)[number]

export type SheetRegistrationInput = {
  token: string
  fullName: string
  phone: string
  email?: string | null
  notes?: string | null
  status: 'confirmed' | 'waitlist' | 'cancelled' | string
  createdAt: Date | string
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
      return status
  }
}

/**
 * Ensures escaped newlines from environment variables are converted to actual newlines.
 * Prevents "error:1E08010C:DECODER routines" with PEM private keys.
 */
export function normalizePrivateKey(rawKey: string): string {
  return rawKey.replace(/\\n/g, '\n')
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
 * Transforms a registration DB entity/input into the exact 9-column format
 * specified for Tab 'Peserta' in 03-DATA-MODEL.md.
 *
 * Security rule: Full token is NEVER leaked to Google Sheets.
 * Only the 8-character uppercase ticket number is written.
 */
export function formatRegistrationForSheet(
  input: SheetRegistrationInput,
): Record<PesertaHeader, string> {
  return {
    'No. Tiket': ticketNumber(input.token),
    'Nama Lengkap': input.fullName,
    'WhatsApp': formatPhoneForDisplay(input.phone),
    'Email': input.email ?? '',
    Status: mapStatusToIndonesian(input.status),
    'Waktu Daftar': formatWib(input.createdAt),
    'Waktu Check-in': input.checkedInAt ? formatWib(input.checkedInAt) : '',
    Petugas: input.checkedInBy ?? '',
    Catatan: input.notes ?? '',
  }
}

/**
 * Instantiates and loads metadata for the Google Spreadsheet document using
 * a Service Account JWT client.
 */
export async function getSpreadsheetDoc(): Promise<GoogleSpreadsheet> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY
  const sheetId = process.env.GOOGLE_SHEET_ID

  if (!email || !privateKeyRaw || !sheetId) {
    throw new Error(
      'Google Sheets credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID.',
    )
  }

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

export const sheets = {
  appendRegistration,
  formatRegistrationForSheet,
  getSpreadsheetDoc,
  isSheetsConfigured,
  normalizePrivateKey,
  mapStatusToIndonesian,
}
