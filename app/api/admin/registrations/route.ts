import { apiError } from '@/lib/api-response'
import { isAdmin } from '@/lib/auth'
import { getPublishedEvent } from '@/lib/db/queries/event'
import { getAdminEvent, getAdminRegistrations } from '@/lib/db/queries/registrations'

export const dynamic = 'force-dynamic'

/**
 * Returns paginated attendee list for the admin panel with search,
 * status filtering, and sorting. Excludes tokens for security.
 * Query params: ?q=...&status=...&checkedIn=...&sort=...&page=...&limit=...
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

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? undefined
  const status = searchParams.get('status') ?? undefined
  const checkedIn = searchParams.get('checkedIn') ?? undefined
  const sort = searchParams.get('sort') ?? undefined
  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  const page = pageParam ? parseInt(pageParam, 10) : 1
  const limit = limitParam ? parseInt(limitParam, 10) : 50

  const result = await getAdminRegistrations({
    eventId: event.id,
    q,
    status,
    checkedIn,
    sort,
    page: isNaN(page) ? 1 : page,
    limit: isNaN(limit) ? 50 : limit,
  })

  return Response.json(result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
