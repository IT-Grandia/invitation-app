import { apiError } from '@/lib/api-response'
import { isAdmin } from '@/lib/auth'
import { getPublishedEvent } from '@/lib/db/queries/event'
import { getAdminEvent, setEventRegistrationStatus } from '@/lib/db/queries/registrations'

export const dynamic = 'force-dynamic'

/**
 * Toggles or updates the registration status of the active event.
 * status: 'published' (open) | 'closed' (closed).
 */
export async function POST(request: Request) {
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

  const body = await request.json().catch(() => ({}))
  let targetStatus: 'published' | 'closed'

  if (body?.status === 'published' || body?.status === 'closed') {
    targetStatus = body.status
  } else if (typeof body?.closed === 'boolean') {
    targetStatus = body.closed ? 'closed' : 'published'
  } else {
    // Toggle
    targetStatus = event.status === 'published' ? 'closed' : 'published'
  }

  const updated = await setEventRegistrationStatus(event.id, targetStatus)

  if (!updated) {
    return apiError('INTERNAL_ERROR', 'Gagal memperbarui status acara.')
  }

  return Response.json(
    {
      ok: true,
      status: updated.status,
      name: updated.name,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
