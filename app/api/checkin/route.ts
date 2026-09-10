import { apiError, unauthorized } from '@/lib/api-response'
import { isStaff } from '@/lib/auth'
import { formatWibTime } from '@/lib/datetime'
import { commitCheckIn } from '@/lib/db/queries/checkin'
import { getEventStats, getPublishedEvent } from '@/lib/db/queries/event'
import { checkInRequestSchema } from '@/lib/validation/checkin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  if (!isStaff(request)) {
    return unauthorized()
  }

  const body = await request.json().catch(() => null)
  const parsed = checkInRequestSchema.safeParse(body)

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Data yang dikirim tidak valid.')
  }

  const event = await getPublishedEvent()

  if (!event) {
    return apiError('NOT_FOUND', 'Belum ada acara yang aktif.')
  }

  const { token, staffLabel, clientScannedAt } = parsed.data

  const result = await commitCheckIn({
    rawToken: token,
    eventId: event.id,
    staffLabel,
    clientScannedAt: clientScannedAt ? new Date(clientScannedAt) : null,
  })

  const registration = result.registration

  switch (result.status) {
    case 'ok': {
      const stats = await getEventStats(event.id)

      return Response.json(
        {
          status: 'ok',
          registration,
          stats: { checkedIn: stats.checkedIn, total: stats.registered },
        },
        { headers: NO_STORE },
      )
    }

    case 'already_used':
      // The name and the earlier time are what let an officer settle a dispute at
      // the gate. The endpoint is behind the staff key, so this is not a leak.
      return apiError(
        'ALREADY_CHECKED_IN',
        registration?.checkedInAt
          ? `QR ini sudah dipakai pukul ${formatWibTime(registration.checkedInAt)}.`
          : 'QR ini sudah dipakai.',
        registration ?? undefined,
        NO_STORE,
      )

    case 'cancelled':
      return apiError(
        'REGISTRATION_CANCELLED',
        'Pendaftaran ini sudah dibatalkan.',
        registration ?? undefined,
        NO_STORE,
      )

    case 'wrong_event':
      return apiError('NOT_FOUND', 'Tiket ini untuk acara lain.', undefined, NO_STORE)

    default:
      return apiError('NOT_FOUND', 'QR tidak dikenali.', undefined, NO_STORE)
  }
}
