import { and, asc, desc, eq, isNotNull, isNull, ne, or, sql } from 'drizzle-orm'

import { db } from '../index'
import { checkInLogs, events, registrations } from '../schema'
import type { Event, Registration } from '../schema'
import { generateToken, ticketNumber } from '../../token'

export type RegisterParticipantInput = {
  eventId: string
  fullName: string
  phone: string // Already normalised to E.164 (e.g. 628123456789)
  email?: string | null
  notes?: string | null
  community?: string | null
  investmentInterests?: string[]
  attending?: boolean
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
          community: input.community ?? null,
          investmentInterests: input.investmentInterests ?? [],
          attending: input.attending ?? true,
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

/**
 * Updates a registration with its mirrored Google Sheets row number
 * and marks the sync timestamp.
 */
export async function markRegistrationSheetSynced(
  id: string,
  sheetRow: number,
): Promise<Registration | null> {
  const [row] = await db
    .update(registrations)
    .set({
      sheetRow,
      sheetSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(registrations.id, id))
    .returning()

  return row ?? null
}

/**
 * Retrieves registrations that haven't been synced to Google Sheets yet,
 * ordered by registration time. (03-DATA-MODEL.md §5.4)
 */
export async function getUnsyncedRegistrations(limit = 100): Promise<Registration[]> {
  return db
    .select()
    .from(registrations)
    .where(
      and(
        isNull(registrations.sheetSyncedAt),
        ne(registrations.status, 'cancelled'),
      ),
    )
    .orderBy(asc(registrations.createdAt))
    .limit(limit)
}

export type SheetSyncStatus = {
  pending: number
  lastSyncedAt: string | null
}

/**
 * Returns the count of registrations waiting to be synced to Sheets and the timestamp of the last sync.
 */
export async function getSheetSyncStatus(eventId: string): Promise<SheetSyncStatus> {
  const [row] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${registrations.sheetSyncedAt} is null and ${registrations.status} <> 'cancelled')`.mapWith(Number),
      lastSyncedAt: sql<Date | null>`max(${registrations.sheetSyncedAt})`,
    })
    .from(registrations)
    .where(eq(registrations.eventId, eventId))

  return {
    pending: row?.pending ?? 0,
    lastSyncedAt: row?.lastSyncedAt ? new Date(row.lastSyncedAt).toISOString() : null,
  }
}

/**
 * Retrieves the event to display in the admin panel.
 * Prioritises published events, and falls back to closed or draft events.
 */
export async function getAdminEvent(): Promise<Event | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(sql`${events.status} in ('published', 'closed')`)
    .orderBy(asc(events.startsAt))
    .limit(1)

  return event ?? null
}

export type LastCheckInInfo = {
  checkedInAt: string
  checkedInBy: string | null
}

/**
 * Retrieves the most recent confirmed check-in for the given event,
 * along with the staff label if available.
 */
export async function getLastCheckIn(eventId: string): Promise<LastCheckInInfo | null> {
  const [row] = await db
    .select({
      checkedInAt: registrations.checkedInAt,
      checkedInBy: registrations.checkedInBy,
    })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, eventId),
        isNotNull(registrations.checkedInAt),
      ),
    )
    .orderBy(desc(registrations.checkedInAt))
    .limit(1)

  if (!row || !row.checkedInAt) {
    return null
  }

  return {
    checkedInAt: new Date(row.checkedInAt).toISOString(),
    checkedInBy: row.checkedInBy,
  }
}

export type GetAdminRegistrationsOptions = {
  eventId: string
  q?: string
  status?: string
  checkedIn?: string
  sort?: string
  page?: number
  limit?: number
}

export type AdminRegistrationRow = {
  id: string
  ticketNumber: string
  fullName: string
  phone: string
  status: string
  checkedInAt: string | null
  createdAt: string
}

export type AdminRegistrationsResult = {
  items: AdminRegistrationRow[]
  page: number
  limit: number
  total: number
}

/**
 * Retrieves paginated participant registrations for the admin panel with search,
 * status filtering, and sorting. Excludes the participant token for security.
 * (04-API-SPEC.md §8)
 */
export async function getAdminRegistrations(
  options: GetAdminRegistrationsOptions,
): Promise<AdminRegistrationsResult> {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(100, Math.max(1, options.limit ?? 50))
  const offset = (page - 1) * limit

  const conditions = [eq(registrations.eventId, options.eventId)]

  if (options.status && options.status !== 'all') {
    conditions.push(eq(registrations.status, options.status))
  }

  if (options.checkedIn === 'true') {
    conditions.push(isNotNull(registrations.checkedInAt))
  } else if (options.checkedIn === 'false') {
    conditions.push(isNull(registrations.checkedInAt))
  }

  if (options.q && options.q.trim()) {
    const cleanQ = options.q.trim()
    const searchPattern = `%${cleanQ}%`
    conditions.push(
      or(
        sql`${registrations.fullName} ilike ${searchPattern}`,
        sql`${registrations.phone} like ${searchPattern}`,
        sql`upper(substring(${registrations.token} from 1 for 8)) like upper(${searchPattern})`,
      )!,
    )
  }

  let orderByClause
  switch (options.sort) {
    case 'created_asc':
      orderByClause = asc(registrations.createdAt)
      break
    case 'name_asc':
      orderByClause = asc(registrations.fullName)
      break
    case 'name_desc':
      orderByClause = desc(registrations.fullName)
      break
    case 'checkin_desc':
      orderByClause = desc(registrations.checkedInAt)
      break
    case 'created_desc':
    default:
      orderByClause = desc(registrations.createdAt)
      break
  }

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(registrations)
    .where(and(...conditions))

  const total = totalRow?.count ?? 0

  const rows = await db
    .select({
      id: registrations.id,
      token: registrations.token,
      fullName: registrations.fullName,
      phone: registrations.phone,
      status: registrations.status,
      checkedInAt: registrations.checkedInAt,
      createdAt: registrations.createdAt,
    })
    .from(registrations)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset)

  const items: AdminRegistrationRow[] = rows.map((row) => ({
    id: row.id,
    ticketNumber: ticketNumber(row.token),
    fullName: row.fullName,
    phone: row.phone,
    status: row.status,
    checkedInAt: row.checkedInAt ? new Date(row.checkedInAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  }))

  return {
    items,
    page,
    limit,
    total,
  }
}

export type AdminActionResult =
  | { status: 'ok'; item: AdminRegistrationRow }
  | { status: 'not_found'; message: string }
  | { status: 'already_checked_in'; message: string }
  | { status: 'not_checked_in'; message: string }
  | { status: 'registration_cancelled'; message: string }
  | { status: 'event_full'; message: string }
  | { status: 'phone_already_registered'; message: string }

function toAdminRow(row: Registration): AdminRegistrationRow {
  return {
    id: row.id,
    ticketNumber: ticketNumber(row.token),
    fullName: row.fullName,
    phone: row.phone,
    status: row.status,
    checkedInAt: row.checkedInAt ? new Date(row.checkedInAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

/**
 * Manually marks an attendee as checked in from the admin panel and writes
 * an audit entry into check_in_logs with staff_label "ADMIN: <label>".
 */
export async function adminManualCheckIn(
  id: string,
  staffLabel = 'ADMIN: Manual',
): Promise<AdminActionResult> {
  const [existing] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1)

  if (!existing) {
    return { status: 'not_found', message: 'Pendaftaran tidak ditemukan.' }
  }

  if (existing.status === 'cancelled') {
    return { status: 'registration_cancelled', message: 'Pendaftaran ini sudah dibatalkan.' }
  }

  if (existing.checkedInAt) {
    return { status: 'already_checked_in', message: 'Peserta ini sudah pernah check-in.' }
  }

  const now = new Date()
  const [updated] = await db
    .update(registrations)
    .set({
      checkedInAt: now,
      checkedInBy: staffLabel,
      updatedAt: now,
    })
    .where(
      and(
        eq(registrations.id, id),
        isNull(registrations.checkedInAt),
        eq(registrations.status, 'confirmed'),
      ),
    )
    .returning()

  if (!updated) {
    return { status: 'already_checked_in', message: 'Peserta ini sudah pernah check-in.' }
  }

  await db.insert(checkInLogs).values({
    registrationId: updated.id,
    rawToken: updated.token,
    result: 'ok',
    staffLabel,
    scannedAt: now,
  })

  return { status: 'ok', item: toAdminRow(updated) }
}

/**
 * Reverses a check-in status back to unconfirmed presence without modifying the registration.
 */
export async function adminUndoCheckIn(id: string): Promise<AdminActionResult> {
  const [existing] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1)

  if (!existing) {
    return { status: 'not_found', message: 'Pendaftaran tidak ditemukan.' }
  }

  if (!existing.checkedInAt) {
    return { status: 'not_checked_in', message: 'Peserta ini belum check-in.' }
  }

  const now = new Date()
  const [updated] = await db
    .update(registrations)
    .set({
      checkedInAt: null,
      checkedInBy: null,
      updatedAt: now,
    })
    .where(eq(registrations.id, id))
    .returning()

  return { status: 'ok', item: toAdminRow(updated) }
}

/**
 * Cancels a registration, releasing quota and allowing the phone number to re-register.
 */
export async function adminCancelRegistration(id: string): Promise<AdminActionResult> {
  const [existing] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1)

  if (!existing) {
    return { status: 'not_found', message: 'Pendaftaran tidak ditemukan.' }
  }

  if (existing.status === 'cancelled') {
    return { status: 'ok', item: toAdminRow(existing) }
  }

  const now = new Date()
  const [updated] = await db
    .update(registrations)
    .set({
      status: 'cancelled',
      updatedAt: now,
    })
    .where(eq(registrations.id, id))
    .returning()

  return { status: 'ok', item: toAdminRow(updated) }
}

/**
 * Restores a previously cancelled registration back to confirmed,
 * verifying capacity and phone uniqueness.
 */
export async function adminRestoreRegistration(id: string): Promise<AdminActionResult> {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(registrations)
      .where(eq(registrations.id, id))
      .limit(1)

    if (!existing) {
      return { status: 'not_found', message: 'Pendaftaran tidak ditemukan.' }
    }

    if (existing.status === 'confirmed') {
      return { status: 'ok', item: toAdminRow(existing) }
    }

    // Check phone uniqueness
    const [existingPhone] = await tx
      .select({ id: registrations.id })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, existing.eventId),
          eq(registrations.phone, existing.phone),
          ne(registrations.status, 'cancelled'),
          ne(registrations.id, id),
        ),
      )
      .limit(1)

    if (existingPhone) {
      return {
        status: 'phone_already_registered',
        message: 'Nomor telepon ini sudah terdaftar oleh pendaftaran lain yang aktif.',
      }
    }

    // Check capacity
    const [event] = await tx
      .select()
      .from(events)
      .where(eq(events.id, existing.eventId))
      .limit(1)

    if (event && event.capacity !== null) {
      const [countRow] = await tx
        .select({
          count: sql<number>`count(*) filter (where ${registrations.status} = 'confirmed')`.mapWith(Number),
        })
        .from(registrations)
        .where(eq(registrations.eventId, event.id))

      const current = countRow?.count ?? 0
      if (current >= event.capacity) {
        return {
          status: 'event_full',
          message: 'Kuota acara sudah penuh, tidak dapat memulihkan pendaftaran.',
        }
      }
    }

    const now = new Date()
    const [updated] = await tx
      .update(registrations)
      .set({
        status: 'confirmed',
        updatedAt: now,
      })
      .where(eq(registrations.id, id))
      .returning()

    return { status: 'ok', item: toAdminRow(updated) }
  })
}

/**
 * Updates the status of an event (e.g. 'published' to open, 'closed' to stop registration).
 */
export async function setEventRegistrationStatus(
  eventId: string,
  status: 'published' | 'closed',
): Promise<Event | null> {
  const [updated] = await db
    .update(events)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId))
    .returning()

  return updated ?? null
}

/**
 * Retrieves all registrations for an event formatted for CSV export.
 * Ordered chronologically by registration time.
 */
export async function getAllRegistrationsForExport(eventId: string): Promise<Registration[]> {
  return db
    .select()
    .from(registrations)
    .where(eq(registrations.eventId, eventId))
    .orderBy(asc(registrations.createdAt))
}







