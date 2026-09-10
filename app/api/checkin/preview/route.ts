import { apiError, unauthorized } from '@/lib/api-response'
import { isStaff } from '@/lib/auth'
import { previewCheckIn } from '@/lib/db/queries/checkin'
import { getPublishedEvent } from '@/lib/db/queries/event'
import { previewRequestSchema } from '@/lib/validation/checkin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isStaff(request)) {
    return unauthorized()
  }

  const body = await request.json().catch(() => null)
  const parsed = previewRequestSchema.safeParse(body)

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Data yang dikirim tidak valid.')
  }

  const event = await getPublishedEvent()

  if (!event) {
    return apiError('NOT_FOUND', 'Belum ada acara yang aktif.')
  }

  const result = await previewCheckIn(parsed.data.token, event.id)

  // Always 200: the outcome of the lookup travels in the body so the scanner can
  // render every case the same way, including the ones it cannot check in.
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
