import { apiError, unauthorized } from '@/lib/api-response'
import { isStaff } from '@/lib/auth'
import { getEventStats, getPublishedEvent } from '@/lib/db/queries/event'

export const dynamic = 'force-dynamic'

/**
 * Confirms a staff key before the scanner shows anything, and hands back the
 * counter for the status bar. Without this the camera would open on an invalid
 * key and only fail once someone was already standing at the gate.
 */
export async function GET(request: Request) {
  if (!isStaff(request)) {
    return unauthorized()
  }

  const event = await getPublishedEvent()

  if (!event) {
    return apiError('NOT_FOUND', 'Belum ada acara yang aktif.')
  }

  const stats = await getEventStats(event.id)

  return Response.json(
    {
      event: { name: event.name },
      stats: { checkedIn: stats.checkedIn, total: stats.registered },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
