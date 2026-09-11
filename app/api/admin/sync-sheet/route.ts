import { apiError } from '@/lib/api-response'
import { isAdmin } from '@/lib/auth'
import {
  getUnsyncedRegistrations,
  markRegistrationSheetSynced,
} from '@/lib/db/queries/registrations'
import { sheets } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

/**
 * Syncs all registrations where sheet_synced_at IS NULL to Google Sheets.
 * Returns { synced, failed, durationMs }.
 * (04-API-SPEC.md §8)
 */
export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return apiError('UNAUTHORIZED', 'Kode admin tidak valid.', undefined, {
      'Cache-Control': 'no-store',
    })
  }

  const startTime = Date.now()

  if (!sheets.isSheetsConfigured()) {
    return Response.json(
      {
        synced: 0,
        failed: 0,
        durationMs: 0,
        error: 'Google Sheets belum dikonfigurasi pada environment.',
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }

  try {
    const unsyncedRows = await getUnsyncedRegistrations(500)

    if (unsyncedRows.length === 0) {
      return Response.json(
        {
          synced: 0,
          failed: 0,
          durationMs: Date.now() - startTime,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const doc = await sheets.getSpreadsheetDoc()
    let synced = 0
    let failed = 0

    for (const row of unsyncedRows) {
      try {
        const { sheetRow } = await sheets.appendRegistration(row, doc)
        await markRegistrationSheetSynced(row.id, sheetRow)
        synced++
      } catch {
        failed++
      }
    }

    return Response.json(
      {
        synced,
        failed,
        durationMs: Date.now() - startTime,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch {
    return apiError('INTERNAL_ERROR', 'Terjadi kesalahan saat sinkronisasi Google Sheets.')
  }
}
