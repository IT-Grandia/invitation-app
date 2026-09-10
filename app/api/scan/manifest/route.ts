import { apiError, unauthorized } from '@/lib/api-response'
import { isStaff } from '@/lib/auth'
import { getManifest } from '@/lib/db/queries/checkin'
import { getPublishedEvent } from '@/lib/db/queries/event'
import type { Manifest } from '@/lib/scanner-search'

export const dynamic = 'force-dynamic'

// Returns every admissible participant together with their token, so it is the
// most sensitive response in the application and must never skip the staff check.
export async function GET(request: Request) {
  if (!isStaff(request)) {
    return unauthorized()
  }

  const event = await getPublishedEvent()

  if (!event) {
    return apiError('NOT_FOUND', 'Belum ada acara yang aktif.')
  }

  const entries = await getManifest(event.id)

  const manifest: Manifest = {
    eventId: event.id,
    eventName: event.name,
    updatedAt: new Date().toISOString(),
    total: entries.length,
    entries,
  }

  return Response.json(manifest, { headers: { 'Cache-Control': 'no-store' } })
}
