import type { GoogleSpreadsheet } from 'google-spreadsheet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  recordCheckInToSheet,
  SHEET_TAB_PESERTA,
  sheets,
  updateParticipantCheckIn,
} from '@/lib/sheets'

describe('updateParticipantCheckIn', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updates Check-in column via fast path when sheetRow is known and valid', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn()

    const mockRow = {
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
    expect(mockSet).toHaveBeenCalledWith('Check-in', 'Yes')
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('falls back to searching all rows by WhatsApp / Name / No Tiket when sheetRow is not provided', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn()

    const otherRow = {
      get: vi.fn((col: string) => (col === 'WhatsApp' ? '0899-9999-999' : '')),
      set: vi.fn(),
      save: vi.fn(),
      rowNumber: 2,
    }
    const targetRow = {
      get: vi.fn((col: string) => (col === 'WhatsApp' ? '0812-3456-789' : col === 'Name' ? 'Budi Santoso' : col === 'No Tiket' ? 'ABCD1234' : '')),
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
        fullName: 'Budi Santoso',
        phone: '628123456789',
        ticketNumber: 'ABCD1234',
        sheetRow: null,
        checkedInAt: '2026-09-26T01:15:00.000Z',
        checkedInBy: 'Gate 2',
      },
      mockDoc,
    )

    expect(result).toEqual({ updated: true, sheetRow: 3 })
    expect(mockGetRows).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalledWith('Check-in', 'Yes')
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('returns updated: false if participant cannot be found', async () => {
    const mockGetRows = vi.fn().mockResolvedValue([])
    const mockSheet = { getRows: mockGetRows }

    const mockDoc = {
      sheetsByTitle: {
        [SHEET_TAB_PESERTA]: mockSheet,
      },
    } as unknown as GoogleSpreadsheet

    const result = await updateParticipantCheckIn(
      {
        fullName: 'NONEXIST',
        phone: '628999999999',
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

  it('updates Tab Peserta on successful check-in ("ok")', async () => {
    const spyUpdate = vi.spyOn(sheets, 'updateParticipantCheckIn').mockResolvedValue({ updated: true, sheetRow: 5 })

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
  })

  it('does NOT update Tab Peserta when result is not "ok"', async () => {
    const spyUpdate = vi.spyOn(sheets, 'updateParticipantCheckIn').mockResolvedValue({ updated: false })

    const mockDoc = {} as GoogleSpreadsheet
    vi.spyOn(sheets, 'getSpreadsheetDoc').mockResolvedValue(mockDoc)

    await recordCheckInToSheet({
      ticketNumber: 'ABCD1234',
      fullName: 'Budi Santoso',
      result: 'already_used',
      mode: 'online',
    })

    expect(spyUpdate).not.toHaveBeenCalled()
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
