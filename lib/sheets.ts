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

export const LOG_CHECKIN_HEADERS = [
  'Waktu (WIB)',
  'No. Tiket',
  'Nama',
  'Hasil',
  'Petugas',
  'Mode',
] as const

export type LogCheckInHeader = (typeof LOG_CHECKIN_HEADERS)[number]

export type SheetLogCheckInInput = {
  timestamp: Date | string
  ticketNumber: string
  fullName?: string | null
  result: string
  staffLabel?: string | null
  mode?: 'online' | 'offline'
}

export function mapCheckInOutcomeToIndonesian(outcome: string): string {
  switch (outcome) {
    case 'ok':
      return 'Berhasil'
    case 'already_used':
      return 'Sudah Digunakan'
    case 'not_found':
      return 'Tidak Ditemukan'
    case 'cancelled':
      return 'Dibatalkan'
    case 'wrong_event':
      return 'Acara Berbeda'
    default:
      return outcome
  }
}

export type UpdateCheckInInput = {
  ticketNumber: string
  sheetRow?: number | null
  checkedInAt: Date | string
  checkedInBy?: string | null
}

/**
 * Updates columns 'Waktu Check-in' and 'Petugas' in Tab 'Peserta' for a participant.
 * Uses fast path if sheetRow is known and valid, with fallback search by 'No. Tiket'.
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

  const checkInTimeWib = formatWib(input.checkedInAt)
  const staff = input.checkedInBy ?? ''

  // 1. Fast path: if sheetRow is known and points to a data row (>= 2)
  if (input.sheetRow && input.sheetRow >= 2) {
    try {
      const rows = await sheet.getRows({ offset: input.sheetRow - 2, limit: 1 })
      const targetRow = rows[0]
      if (targetRow && targetRow.get('No. Tiket') === input.ticketNumber) {
        targetRow.set('Waktu Check-in', checkInTimeWib)
        targetRow.set('Petugas', staff)
        await targetRow.save()
        return { updated: true, sheetRow: input.sheetRow }
      }
    } catch (err) {
      console.warn(`[Sheets Mirror] Gagal update via offset baris ${input.sheetRow}:`, err)
    }
  }

  // 2. Fallback: Search rows by No. Tiket
  try {
    const allRows = await sheet.getRows()
    const matched = allRows.find((r) => r.get('No. Tiket') === input.ticketNumber)
    if (matched) {
      matched.set('Waktu Check-in', checkInTimeWib)
      matched.set('Petugas', staff)
      await matched.save()
      return { updated: true, sheetRow: matched.rowNumber }
    }
  } catch (err) {
    console.warn('[Sheets Mirror] Gagal mencari baris peserta di spreadsheet:', err)
  }

  return { updated: false }
}

/**
 * Appends a check-in attempt log entry into Tab 'Log Check-in'.
 */
export async function appendCheckInLog(
  input: SheetLogCheckInInput,
  docInstance?: GoogleSpreadsheet,
): Promise<{ success: boolean }> {
  const doc = docInstance ?? (await sheets.getSpreadsheetDoc())
  const sheet = doc.sheetsByTitle[SHEET_TAB_LOG_CHECKIN]

  if (!sheet) {
    console.warn(`[Sheets Mirror] Tab "${SHEET_TAB_LOG_CHECKIN}" tidak ditemukan di spreadsheet.`)
    return { success: false }
  }

  await sheet.addRow({
    'Waktu (WIB)': formatWib(input.timestamp),
    'No. Tiket': input.ticketNumber,
    Nama: input.fullName ?? '-',
    Hasil: mapCheckInOutcomeToIndonesian(input.result),
    Petugas: input.staffLabel ?? '',
    Mode: input.mode === 'offline' ? 'Offline tersinkron' : 'Online',
  })

  return { success: true }
}

export type RecordCheckInSheetInput = {
  ticketNumber: string
  fullName?: string | null
  sheetRow?: number | null
  checkedInAt?: Date | string | null
  checkedInBy?: string | null
  result: string
  mode?: 'online' | 'offline'
}

/**
 * Best-effort mirror helper for check-ins:
 * - Updates Tab 1 'Peserta' if check-in was successful ('ok')
 * - Appends audit entry to Tab 2 'Log Check-in' for all attempts
 * - Catches any internal error so calling handler is never interrupted
 */
export async function recordCheckInToSheet(
  input: RecordCheckInSheetInput,
  docInstance?: GoogleSpreadsheet,
): Promise<void> {
  if (!isSheetsConfigured()) {
    return
  }

  try {
    const doc = docInstance ?? (await sheets.getSpreadsheetDoc())
    const timestamp = input.checkedInAt ?? new Date()
    const mode = input.mode ?? 'online'

    // 1. Tab 1: Update cell in 'Peserta' when check-in succeeded
    if (input.result === 'ok') {
      try {
        await sheets.updateParticipantCheckIn(
          {
            ticketNumber: input.ticketNumber,
            sheetRow: input.sheetRow,
            checkedInAt: timestamp,
            checkedInBy: input.checkedInBy,
          },
          doc,
        )
      } catch (updateErr) {
        console.warn(
          `[Sheets Mirror] Gagal memperbarui sel check-in peserta (${input.ticketNumber}):`,
          updateErr,
        )
      }
    }

    // 2. Tab 2: Append audit row to 'Log Check-in' for all outcomes
    try {
      await sheets.appendCheckInLog(
        {
          timestamp,
          ticketNumber: input.ticketNumber,
          fullName: input.fullName,
          result: input.result,
          staffLabel: input.checkedInBy,
          mode,
        },
        doc,
      )
    } catch (logErr) {
      console.warn(
        `[Sheets Mirror] Gagal menambahkan log check-in (${input.ticketNumber}):`,
        logErr,
      )
    }
  } catch (err) {
    console.warn('[Sheets Mirror] Gagal memproses sinkronisasi check-in ke Sheets:', err)
  }
}

export const sheets = {
  appendRegistration,
  formatRegistrationForSheet,
  getSpreadsheetDoc,
  isSheetsConfigured,
  normalizePrivateKey,
  extractSpreadsheetId,
  mapStatusToIndonesian,
  mapCheckInOutcomeToIndonesian,
  updateParticipantCheckIn,
  appendCheckInLog,
  recordCheckInToSheet,
}
