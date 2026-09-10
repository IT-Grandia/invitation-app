import { and, eq, isNull } from 'drizzle-orm'

import { extractToken, ticketNumber } from '../../token'
import { db } from '../index'
import { checkInLogs, registrations } from '../schema'
import type { Registration } from '../schema'

export type PreviewStatus = 'ready' | 'already_used' | 'not_found' | 'cancelled' | 'wrong_event'
export type CheckInOutcome = Exclude<PreviewStatus, 'ready'> | 'ok'

export type RegistrationSummary = {
  ticketNumber: string
  fullName: string
  status: string
  checkedInAt: string | null
  checkedInBy: string | null
}

export type PreviewResult = {
  status: PreviewStatus
  canCheckIn: boolean
  registration: RegistrationSummary | null
}

export type CheckInResult = {
  status: CheckInOutcome
  registration: RegistrationSummary | null
}

type LogEntry = {
  registrationId?: string | null
  rawToken: string
  result: CheckInOutcome
  staffLabel?: string | null
  clientScannedAt?: Date | null
  deviceInfo?: string | null
  syncedOffline?: boolean
}

function summarise(row: Registration): RegistrationSummary {
  return {
    ticketNumber: ticketNumber(row.token),
    fullName: row.fullName,
    status: row.status,
    checkedInAt: row.checkedInAt?.toISOString() ?? null,
    checkedInBy: row.checkedInBy,
  }
}

async function findByToken(token: string): Promise<Registration | null> {
  const [row] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.token, token))
    .limit(1)

  return row ?? null
}

function classify(row: Registration | null, eventId: string): PreviewStatus {
  if (!row) {
    return 'not_found'
  }

  if (row.eventId !== eventId) {
    return 'wrong_event'
  }

  // Waitlisted entrants hold no confirmed place, so they follow the same
  // not-eligible path as cancellations and need a decision from the organisers.
  if (row.status !== 'confirmed') {
    return 'cancelled'
  }

  return row.checkedInAt ? 'already_used' : 'ready'
}

// A failure to record the attempt must not deny entry to someone standing at the
// gate, so the audit write is deliberately not part of the check-in's success.
async function writeLog(entry: LogEntry): Promise<void> {
  try {
    await db.insert(checkInLogs).values({
      registrationId: entry.registrationId ?? null,
      rawToken: entry.rawToken,
      result: entry.result,
      staffLabel: entry.staffLabel ?? null,
      clientScannedAt: entry.clientScannedAt ?? null,
      deviceInfo: entry.deviceInfo ?? null,
      syncedOffline: entry.syncedOffline ?? false,
    })
  } catch (error) {
    console.error('failed to write check-in log', error)
  }
}

/**
 * First half of the two-step check-in: reports who owns a ticket without
 * recording anything. Scanning the wrong code, or catching a bystander's screen,
 * must leave no trace, so this path never writes — not even to the audit log.
 */
export async function previewCheckIn(rawToken: string, eventId: string): Promise<PreviewResult> {
  const token = extractToken(rawToken)

  if (!token) {
    return { status: 'not_found', canCheckIn: false, registration: null }
  }

  const row = await findByToken(token)
  const status = classify(row, eventId)

  return {
    status,
    canCheckIn: status === 'ready',
    registration: row ? summarise(row) : null,
  }
}

/**
 * Second half: records attendance once the officer has confirmed the name.
 *
 * The conditional update is what makes a ticket single-use. Reading the row and
 * then writing it leaves a window in which two scanners both see an unused
 * ticket; a single statement guarded by `checked_in_at is null` does not.
 */
export async function commitCheckIn(input: {
  rawToken: string
  eventId: string
  staffLabel?: string | null
  clientScannedAt?: Date | null
  deviceInfo?: string | null
  syncedOffline?: boolean
}): Promise<CheckInResult> {
  const token = extractToken(input.rawToken)

  const logDefaults = {
    staffLabel: input.staffLabel,
    clientScannedAt: input.clientScannedAt,
    deviceInfo: input.deviceInfo,
    syncedOffline: input.syncedOffline,
  }

  if (!token) {
    await writeLog({ ...logDefaults, rawToken: input.rawToken, result: 'not_found' })
    return { status: 'not_found', registration: null }
  }

  const now = new Date()

  const [updated] = await db
    .update(registrations)
    .set({ checkedInAt: now, checkedInBy: input.staffLabel ?? null, updatedAt: now })
    .where(
      and(
        eq(registrations.token, token),
        eq(registrations.eventId, input.eventId),
        eq(registrations.status, 'confirmed'),
        isNull(registrations.checkedInAt),
      ),
    )
    .returning()

  if (updated) {
    await writeLog({
      ...logDefaults,
      registrationId: updated.id,
      rawToken: token,
      result: 'ok',
    })

    return { status: 'ok', registration: summarise(updated) }
  }

  const existing = await findByToken(token)
  const verdict = classify(existing, input.eventId)

  // A 'ready' verdict here means another request won the race between the update
  // and this read, so the ticket is spent either way.
  const result: CheckInOutcome = verdict === 'ready' ? 'already_used' : verdict

  await writeLog({
    ...logDefaults,
    registrationId: existing?.id ?? null,
    rawToken: token,
    result,
  })

  return { status: result, registration: existing ? summarise(existing) : null }
}
