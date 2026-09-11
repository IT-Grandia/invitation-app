import { apiError } from '@/lib/api-response'
import { isAdmin } from '@/lib/auth'
import { getPublishedEvent } from '@/lib/db/queries/event'
import { getAdminEvent, getAllRegistrationsForExport } from '@/lib/db/queries/registrations'
import { PESERTA_HEADERS, sheets } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Returns CSV of all registrations for the event.
 * Matches columns in the 'Peserta' worksheet in Google Sheets.
 * Full participant tokens are strictly excluded for security.
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

  const rows = await getAllRegistrationsForExport(event.id)

  const headerLine = PESERTA_HEADERS.map(escapeCsvCell).join(',')
  const dataLines = rows.map((row) => {
    const formatted = sheets.formatRegistrationForSheet({
      token: row.token,
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      status: row.status,
      createdAt: row.createdAt,
      checkedInAt: row.checkedInAt,
      checkedInBy: row.checkedInBy,
    })

    return PESERTA_HEADERS.map((header) => escapeCsvCell(formatted[header])).join(',')
  })

  const csvContent = [headerLine, ...dataLines].join('\r\n')
  const filename = `peserta-${event.slug || 'padel-day-2026'}.csv`

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
