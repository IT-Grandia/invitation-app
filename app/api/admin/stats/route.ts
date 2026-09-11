import { apiError } from '@/lib/api-response'
import { isAdmin } from '@/lib/auth'
import { getEventStats, getPublishedEvent, remainingCapacity } from '@/lib/db/queries/event'
import { getAdminEvent, getLastCheckIn, getSheetSyncStatus } from '@/lib/db/queries/registrations'
import { extractSpreadsheetId } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

/**
 * Returns event stats and Google Sheets sync status for the admin dashboard.
 * Requires Authorization: Bearer <ADMIN_KEY>.
 * (04-API-SPEC.md §8)
 */
export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return apiError('UNAUTHORIZED', 'Kode admin tidak valid.', undefined, {
      'Cache-Control': 'no-store',
    })
  }

  const event = (await getPublishedEvent()) ?? (await getAdminEvent())

  if (!event) {
    return apiError('NOT_FOUND', 'Belum ada acara yang aktif.', undefined, {
      'Cache-Control': 'no-store',
    })
  }

  const [stats, syncStatus, lastCheckIn] = await Promise.all([
    getEventStats(event.id),
    getSheetSyncStatus(event.id),
    getLastCheckIn(event.id),
  ])

  const rawSheetId = process.env.GOOGLE_SHEET_ID
  const sheetUrl = rawSheetId
    ? `https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(rawSheetId)}/edit`
    : null

  return Response.json(
    {
      event: {
        name: event.name,
        status: event.status,
        startsAt: event.startsAt.toISOString(),
        capacity: event.capacity,
      },
      totals: {
        registered: stats.registered,
        checkedIn: stats.checkedIn,
        notCheckedIn: stats.notCheckedIn,
        waitlist: stats.waitlist,
        cancelled: stats.cancelled,
        remaining: remainingCapacity(event.capacity, stats.registered),
      },
      sheetSync: {
        pending: syncStatus.pending,
        lastSyncedAt: syncStatus.lastSyncedAt,
        sheetUrl,
      },
      lastCheckIn,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
