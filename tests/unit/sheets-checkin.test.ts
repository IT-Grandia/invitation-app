import type { GoogleSpreadsheet } from 'google-spreadsheet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  appendCheckInLog,
  LOG_CHECKIN_HEADERS,
  mapCheckInOutcomeToIndonesian,
  recordCheckInToSheet,
  SHEET_TAB_LOG_CHECKIN,
  SHEET_TAB_PESERTA,
  sheets,
  updateParticipantCheckIn,
} from '@/lib/sheets'

describe('LOG_CHECKIN_HEADERS', () => {
  it('contains exactly the 6 required headers from 03-DATA-MODEL.md §4', () => {
    expect(LOG_CHECKIN_HEADERS).toEqual([
      'Waktu (WIB)',
      'No. Tiket',
      'Nama',
      'Hasil',
      'Petugas',
      'Mode',
    ])
  })
})

describe('mapCheckInOutcomeToIndonesian', () => {
  it('maps check-in outcomes to clear Indonesian labels', () => {
    expect(mapCheckInOutcomeToIndonesian('ok')).toBe('Berhasil')
    expect(mapCheckInOutcomeToIndonesian('already_used')).toBe('Sudah Digunakan')
    expect(mapCheckInOutcomeToIndonesian('not_found')).toBe('Tidak Ditemukan')
    expect(mapCheckInOutcomeToIndonesian('cancelled')).toBe('Dibatalkan')
    expect(mapCheckInOutcomeToIndonesian('wrong_event')).toBe('Acara Berbeda')
    expect(mapCheckInOutcomeToIndonesian('custom_code')).toBe('custom_code')
  })
})

describe('updateParticipantCheckIn', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updates cell via fast path when sheetRow is known and matches ticketNumber', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn()
    const mockGet = vi.fn((col: string) => (col === 'No. Tiket' ? 'ABCD1234' : ''))

    const mockRow = {
      get: mockGet,
      set: mockSet,
      save: mockSave,
      rowNumber: 15,
    }

    const mockGetRows = vi.fn().mockResolvedValue([mockRow])
    const mockSheet = { getRows: mockGetRows }

    const mockDoc = {
      sheetsByTitle: {
        [SHEET_TAB_PESERTA]: mockSheet,
      },
    } as unknown as GoogleSpreadsheet

    const result = await updateParticipantCheckIn(
      {
        ticketNumber: 'ABCD1234',
        sheetRow: 15,
        checkedInAt: '2026-09-26T01:15:00.000Z',
        checkedInBy: 'Gate 1 - Maya',
      },
      mockDoc,
    )

    expect(result).toEqual({ updated: true, sheetRow: 15 })
    expect(mockGetRows).toHaveBeenCalledWith({ offset: 13, limit: 1 })
    expect(mockSet).toHaveBeenCalledWith('Waktu Check-in', '26 Sep 2026, 08:15')
    expect(mockSet).toHaveBeenCalledWith('Petugas', 'Gate 1 - Maya')
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('falls back to searching all rows when sheetRow is not provided', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn()

    const otherRow = {
      get: vi.fn((col: string) => (col === 'No. Tiket' ? 'OTHER123' : '')),
      set: vi.fn(),
      save: vi.fn(),
      rowNumber: 2,
    }
    const targetRow = {
      get: vi.fn((col: string) => (col === 'No. Tiket' ? 'ABCD1234' : '')),
      set: mockSet,
      save: mockSave,
      rowNumber: 3,
    }

    const mockGetRows = vi.fn().mockResolvedValue([otherRow, targetRow])
    const mockSheet = { getRows: mockGetRows }

    const mockDoc = {
      sheetsByTitle: {
        [SHEET_TAB_PESERTA]: mockSheet,
      },
    } as unknown as GoogleSpreadsheet

    const result = await updateParticipantCheckIn(
      {
        ticketNumber: 'ABCD1234',
        sheetRow: null,
        checkedInAt: '2026-09-26T01:15:00.000Z',
        checkedInBy: 'Gate 2',
      },
      mockDoc,
    )

    expect(result).toEqual({ updated: true, sheetRow: 3 })
    expect(mockGetRows).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalledWith('Waktu Check-in', '26 Sep 2026, 08:15')
    expect(mockSet).toHaveBeenCalledWith('Petugas', 'Gate 2')
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('returns updated: false if ticket number cannot be found', async () => {
    const mockGetRows = vi.fn().mockResolvedValue([])
    const mockSheet = { getRows: mockGetRows }

    const mockDoc = {
      sheetsByTitle: {
        [SHEET_TAB_PESERTA]: mockSheet,
      },
    } as unknown as GoogleSpreadsheet

    const result = await updateParticipantCheckIn(
      {
        ticketNumber: 'NONEXIST',
        checkedInAt: new Date(),
      },
      mockDoc,
    )

    expect(result).toEqual({ updated: false })
  })

  it('handles missing Peserta tab gracefully without throwing', async () => {
    const mockDoc = {
      sheetsByTitle: {},
    } as unknown as GoogleSpreadsheet

    const result = await updateParticipantCheckIn(
      {
        ticketNumber: 'ABCD1234',
        checkedInAt: new Date(),
      },
      mockDoc,
    )

    expect(result).toEqual({ updated: false })
  })
})

describe('appendCheckInLog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('appends formatted check-in log row into Tab "Log Check-in"', async () => {
    const mockAddRow = vi.fn().mockResolvedValue(undefined)
    const mockSheet = { addRow: mockAddRow }

    const mockDoc = {
      sheetsByTitle: {
        [SHEET_TAB_LOG_CHECKIN]: mockSheet,
      },
    } as unknown as GoogleSpreadsheet

    const result = await appendCheckInLog(
      {
        timestamp: '2026-09-26T01:03:00.000Z',
        ticketNumber: 'ABCD1234',
        fullName: 'Budi Santoso',
        result: 'ok',
        staffLabel: 'Gate A - Rina',
        mode: 'online',
      },
      mockDoc,
    )

    expect(result).toEqual({ success: true })
    expect(mockAddRow).toHaveBeenCalledTimes(1)
    expect(mockAddRow).toHaveBeenCalledWith({
      'Waktu (WIB)': '26 Sep 2026, 08:03',
      'No. Tiket': 'ABCD1234',
      Nama: 'Budi Santoso',
      Hasil: 'Berhasil',
      Petugas: 'Gate A - Rina',
      Mode: 'Online',
    })
  })

  it('formats offline synced check-in log appropriately', async () => {
    const mockAddRow = vi.fn().mockResolvedValue(undefined)
    const mockSheet = { addRow: mockAddRow }

    const mockDoc = {
      sheetsByTitle: {
        [SHEET_TAB_LOG_CHECKIN]: mockSheet,
      },
    } as unknown as GoogleSpreadsheet

    const result = await appendCheckInLog(
      {
        timestamp: '2026-09-26T01:03:00.000Z',
        ticketNumber: 'WXYZ9876',
        fullName: 'Siti Aminah',
        result: 'already_used',
        staffLabel: 'Gate B',
        mode: 'offline',
      },
      mockDoc,
    )

    expect(result).toEqual({ success: true })
    expect(mockAddRow).toHaveBeenCalledWith({
      'Waktu (WIB)': '26 Sep 2026, 08:03',
      'No. Tiket': 'WXYZ9876',
      Nama: 'Siti Aminah',
      Hasil: 'Sudah Digunakan',
      Petugas: 'Gate B',
      Mode: 'Offline tersinkron',
    })
  })

  it('handles missing Log Check-in tab gracefully without throwing', async () => {
    const mockDoc = {
      sheetsByTitle: {},
    } as unknown as GoogleSpreadsheet

    const result = await appendCheckInLog(
      {
        timestamp: new Date(),
        ticketNumber: 'ABCD1234',
        result: 'not_found',
      },
      mockDoc,
    )

    expect(result).toEqual({ success: false })
  })
})

describe('recordCheckInToSheet (best-effort helper)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@example.com',
      GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk==\n-----END PRIVATE KEY-----\n',
      GOOGLE_SHEET_ID: 'test-sheet-id',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('returns early without doing anything when Sheets is not configured', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

    const spyGetDoc = vi.spyOn(sheets, 'getSpreadsheetDoc')

    await recordCheckInToSheet({
      ticketNumber: 'ABCD1234',
      result: 'ok',
    })

    expect(spyGetDoc).not.toHaveBeenCalled()
  })

  it('updates Tab 1 and appends Tab 2 on successful check-in ("ok")', async () => {
    const spyUpdate = vi.spyOn(sheets, 'updateParticipantCheckIn').mockResolvedValue({ updated: true, sheetRow: 5 })
    const spyAppend = vi.spyOn(sheets, 'appendCheckInLog').mockResolvedValue({ success: true })

    const mockDoc = {} as GoogleSpreadsheet
    vi.spyOn(sheets, 'getSpreadsheetDoc').mockResolvedValue(mockDoc)

    await recordCheckInToSheet({
      ticketNumber: 'ABCD1234',
      fullName: 'Budi Santoso',
      sheetRow: 5,
      checkedInAt: new Date('2026-09-26T01:03:00.000Z'),
      checkedInBy: 'Gate A',
      result: 'ok',
      mode: 'online',
    })

    expect(spyUpdate).toHaveBeenCalledTimes(1)
    expect(spyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketNumber: 'ABCD1234',
        sheetRow: 5,
        checkedInBy: 'Gate A',
      }),
      mockDoc,
    )

    expect(spyAppend).toHaveBeenCalledTimes(1)
    expect(spyAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketNumber: 'ABCD1234',
        fullName: 'Budi Santoso',
        result: 'ok',
        staffLabel: 'Gate A',
        mode: 'online',
      }),
      mockDoc,
    )
  })

  it('only appends Tab 2 and does NOT update Tab 1 when result is not "ok"', async () => {
    const spyUpdate = vi.spyOn(sheets, 'updateParticipantCheckIn').mockResolvedValue({ updated: false })
    const spyAppend = vi.spyOn(sheets, 'appendCheckInLog').mockResolvedValue({ success: true })

    const mockDoc = {} as GoogleSpreadsheet
    vi.spyOn(sheets, 'getSpreadsheetDoc').mockResolvedValue(mockDoc)

    await recordCheckInToSheet({
      ticketNumber: 'ABCD1234',
      fullName: 'Budi Santoso',
      result: 'already_used',
      mode: 'online',
    })

    expect(spyUpdate).not.toHaveBeenCalled()
    expect(spyAppend).toHaveBeenCalledTimes(1)
    expect(spyAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketNumber: 'ABCD1234',
        result: 'already_used',
      }),
      mockDoc,
    )
  })

  it('is completely resilient and does not throw even if Google API throws an error', async () => {
    vi.spyOn(sheets, 'getSpreadsheetDoc').mockRejectedValue(new Error('Google API network timeout'))

    // Must not reject or throw
    await expect(
      recordCheckInToSheet({
        ticketNumber: 'ABCD1234',
        result: 'ok',
      }),
    ).resolves.toBeUndefined()
  })
})
