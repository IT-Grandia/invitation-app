import { and, eq, ne, sql } from 'drizzle-orm'

import { db } from '../index'
import { events, registrations } from '../schema'
import type { Registration } from '../schema'
import { generateToken, ticketNumber } from '../../token'

export type RegisterParticipantInput = {
  eventId: string
  fullName: string
  phone: string // Already normalised to E.164 (e.g. 628123456789)
  email?: string | null
  notes?: string | null
  ipHash?: string | null
}

export type RegisterParticipantResult =
  | {
      status: 'ok'
      registration: Registration
      ticketNumber: string
      eventName: string
      startsAt: string
    }
  | {
      status: 'phone_already_registered'
      message: string
    }
  | {
      status: 'event_full'
      message: string
      details: {
        capacity: number
        registered: number
      }
    }
  | {
      status: 'registration_closed'
      message: string
    }

/**
 * Registers a participant in an atomic transaction.
 *
 * Enforces:
 * 1. Active registration window (opens_at and closes_at)
 * 2. Hard capacity mutex with `FOR UPDATE` on the event row (skipped if capacity is NULL)
 * 3. Duplicate phone prevention (single confirmed registration per phone per event)
 */
export async function registerParticipant(
  input: RegisterParticipantInput,
): Promise<RegisterParticipantResult> {
  const token = generateToken()

  try {
    return await db.transaction(async (tx) => {
      // 1. Lock the event row for update if it has a capacity limit, or select it if unlimited
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.id, input.eventId))
        .for('update')

      if (!event || event.status !== 'published') {
        return {
          status: 'registration_closed',
          message: 'Pendaftaran acara ini sedang tidak aktif.',
        }
      }

      const now = new Date()
      if (now < event.registrationOpensAt) {
        return {
          status: 'registration_closed',
          message: 'Pendaftaran belum dibuka.',
        }
      }

      if (now > event.registrationClosesAt) {
        return {
          status: 'registration_closed',
          message: 'Pendaftaran sudah ditutup.',
        }
      }

      // 2. Enforce quota if event.capacity is set (NULL means unlimited)
      if (event.capacity !== null) {
        const [countRow] = await tx
          .select({
            count: sql<number>`count(*) filter (where ${registrations.status} = 'confirmed')`.mapWith(
              Number,
            ),
          })
          .from(registrations)
          .where(eq(registrations.eventId, event.id))

        const currentRegistered = countRow?.count ?? 0

        if (currentRegistered >= event.capacity) {
          return {
            status: 'event_full',
            message: 'Kuota peserta sudah penuh. Hubungi panitia untuk waiting list.',
            details: {
              capacity: event.capacity,
              registered: currentRegistered,
            },
          }
        }
      }

      // 3. Check for existing active registration with the same phone on this event
      const [existing] = await tx
        .select({ id: registrations.id })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, event.id),
            eq(registrations.phone, input.phone),
            ne(registrations.status, 'cancelled'),
          ),
        )
        .limit(1)

      if (existing) {
        return {
          status: 'phone_already_registered',
          message:
            'Nomor ini sudah terdaftar. Cek link tiket di chat WhatsApp kamu, atau hubungi panitia.',
        }
      }

      // 4. Insert new registration
      const [newRegistration] = await tx
        .insert(registrations)
        .values({
          eventId: event.id,
          token,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email ?? null,
          notes: input.notes ?? null,
          status: 'confirmed',
          ipHash: input.ipHash ?? null,
        })
        .returning()

      return {
        status: 'ok',
        registration: newRegistration,
        ticketNumber: ticketNumber(newRegistration.token),
        eventName: event.name,
        startsAt: event.startsAt.toISOString(),
      }
    })
  } catch (error: unknown) {
    // Catch unique constraint violation on (event_id, phone) in case of concurrent identical submissions
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    ) {
      return {
        status: 'phone_already_registered',
        message:
          'Nomor ini sudah terdaftar. Cek link tiket di chat WhatsApp kamu, atau hubungi panitia.',
      }
    }

    throw error
  }
}

/**
 * Helper to find a registration by its secret token.
 */
export async function findRegistrationByToken(token: string): Promise<Registration | null> {
  const [row] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.token, token))
    .limit(1)

  return row ?? null
}

/**
 * Cancels an active registration, releasing its quota slot and freeing the phone number.
 */
export async function cancelRegistration(id: string): Promise<Registration | null> {
  const [row] = await db
    .update(registrations)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(registrations.id, id))
    .returning()

  return row ?? null
}
