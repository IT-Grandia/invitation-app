import { apiError, unauthorized } from '@/lib/api-response'
import { isStaff } from '@/lib/auth'
import { commitCheckInBatch } from '@/lib/db/queries/checkin'
import { getPublishedEvent } from '@/lib/db/queries/event'
import { batchCheckInRequestSchema } from '@/lib/validation/checkin'

export const dynamic = 'force-dynamic'

// Items are applied one at a time so scan order is respected. A full batch of
// 200 against a remote database can outlast the platform's default time limit.
export const maxDuration = 30

export async function POST(request: Request) {
  if (!isStaff(request)) {
    return unauthorized()
  }

  const body = await request.json().catch(() => null)
  const parsed = batchCheckInRequestSchema.safeParse(body)

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Data yang dikirim tidak valid.')
  }

  const event = await getPublishedEvent()

  if (!event) {
    return apiError('NOT_FOUND', 'Belum ada acara yang aktif.')
  }

  const outcome = await commitCheckInBatch({
    eventId: event.id,
    staffLabel: parsed.data.staffLabel,
    items: parsed.data.items.map((item) => ({
      rawToken: item.token,
      clientScannedAt: new Date(item.clientScannedAt),
      staffLabel: item.staffLabel,
    })),
  })

  // Always 200 once the request itself is valid. Each item carries its own
  // outcome, and one refused ticket must not make the scanner resend the rest.
  return Response.json(outcome, { headers: { 'Cache-Control': 'no-store' } })
}
