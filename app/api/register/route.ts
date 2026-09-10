import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'

import { apiError } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getPublishedEvent } from '@/lib/db/queries/event'
import { registerParticipant } from '@/lib/db/queries/registrations'
import { events, type Event } from '@/lib/db/schema'
import { normalizePhone } from '@/lib/phone'
import { registerApiSchema } from '@/lib/validation/registration'

export const dynamic = 'force-dynamic'

const COOKIE_MAX_AGE = 4838400 // 56 days

function hashClientIp(ip: string): string {
  const salt = process.env.IP_SALT ?? 'grandia-padel-salt'
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('VALIDATION_ERROR', 'Format request harus berupa JSON valid.')
  }

  // 1. Validate payload with shared Zod schema
  const validationResult = registerApiSchema.safeParse(body)
  if (!validationResult.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Data pendaftaran tidak valid.',
      validationResult.error.flatten().fieldErrors,
    )
  }

  const data = validationResult.data

  // 2. Normalise phone to canonical E.164 (628xxx)
  let normalisedPhone: string
  try {
    normalisedPhone = normalizePhone(data.phone)
  } catch {
    return apiError(
      'VALIDATION_ERROR',
      'Nomor WhatsApp tidak valid. Contoh: 08123456789',
    )
  }

  // 3. Find target event (optional eventId param/header for testing/multi-event, fallback to getPublishedEvent)
  let event: Event | null = null
  const eventIdParam =
    new URL(request.url).searchParams.get('eventId') ?? request.headers.get('x-event-id')

  if (eventIdParam) {
    const [found] = await db.select().from(events).where(eq(events.id, eventIdParam)).limit(1)
    event = found ?? null
  } else {
    event = await getPublishedEvent()
  }

  if (!event || event.status !== 'published') {
    return apiError(
      'REGISTRATION_CLOSED',
      'Pendaftaran acara ini sedang tidak aktif.',
    )
  }

  // 4. Check registration window
  const now = new Date()
  if (now < event.registrationOpensAt) {
    return apiError('REGISTRATION_CLOSED', 'Pendaftaran belum dibuka.')
  }
  if (now > event.registrationClosesAt) {
    return apiError('REGISTRATION_CLOSED', 'Pendaftaran sudah ditutup.')
  }

  // 5. Generate pseudonymised IP hash for abuse detection
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  const ipHash = hashClientIp(clientIp)

  // 6. Perform registration in atomic transaction
  try {
    const outcome = await registerParticipant({
      eventId: event.id,
      fullName: data.fullName,
      phone: normalisedPhone,
      email: data.email,
      notes: data.notes,
      ipHash,
    })

    if (outcome.status === 'phone_already_registered') {
      // 🔴 SECURITY RULE: Respond with 409 without leaking any token, name, or ticket URL
      return apiError('PHONE_ALREADY_REGISTERED', outcome.message)
    }

    if (outcome.status === 'event_full') {
      return apiError('EVENT_FULL', outcome.message, outcome.details)
    }

    if (outcome.status === 'registration_closed') {
      return apiError('REGISTRATION_CLOSED', outcome.message)
    }

    // 7. Successful registration: build response and Set-Cookie
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const ticketUrl = `${siteUrl}/t/${outcome.registration.token}`

    const cookieHeader = `padel_ticket=${outcome.registration.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`

    const responseBody = {
      token: outcome.registration.token,
      ticketUrl,
      ticketNumber: outcome.ticketNumber,
      registration: {
        fullName: outcome.registration.fullName,
        eventName: outcome.eventName,
        startsAt: outcome.startsAt,
        status: outcome.registration.status,
      },
    }

    return Response.json(responseBody, {
      status: 201,
      headers: {
        'Set-Cookie': cookieHeader,
      },
    })
  } catch (error) {
    console.error('Registration failed unexpectedly:', error)
    return apiError('INTERNAL_ERROR', 'Terjadi gangguan di sistem. Silakan coba lagi.')
  }
}
