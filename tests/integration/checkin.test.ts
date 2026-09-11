import { eq, gte } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/lib/db'
import {
  commitCheckIn,
  commitCheckInBatch,
  getManifest,
  previewCheckIn,
} from '@/lib/db/queries/checkin'
import { checkInLogs, events, registrations } from '@/lib/db/schema'
import type { Registration } from '@/lib/db/schema'
import { generateToken } from '@/lib/token'

import { raceOnLockedRow } from './row-lock'

let eventId: string
let startedAt: Date
let phoneCounter = 0

async function createEvent(name = 'Test Event') {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const [event] = await db
    .insert(events)
    .values({
      slug: `test-${suffix}`,
      name,
      venueName: 'Test Venue',
      startsAt: new Date('2026-09-26T01:00:00.000Z'),
      endsAt: new Date('2026-09-26T10:00:00.000Z'),
      registrationClosesAt: new Date('2026-09-25T14:00:00.000Z'),
      status: 'draft',
    })
    .returning()

  return event
}

async function createRegistration(
  overrides: Partial<typeof registrations.$inferInsert> = {},
): Promise<Registration> {
  phoneCounter += 1

  const [row] = await db
    .insert(registrations)
    .values({
      eventId,
      token: generateToken(),
      fullName: 'Test Peserta',
      phone: `628999${String(phoneCounter).padStart(6, '0')}`,
      ...overrides,
    })
    .returning()

  return row
}

async function logsFor(rawToken: string) {
  return db.select().from(checkInLogs).where(eq(checkInLogs.rawToken, rawToken))
}

beforeEach(async () => {
  startedAt = new Date()
  const event = await createEvent()
  eventId = event.id
})

afterEach(async () => {
  // Removing the event cascades to its registrations, but logs only lose their
  // foreign key, so they are cleared by the window this test ran in.
  await db.delete(checkInLogs).where(gte(checkInLogs.scannedAt, startedAt))
  await db.delete(events).where(eq(events.id, eventId))
})

describe('commitCheckIn', () => {
  it('lets exactly one of ten concurrent attempts through', async () => {
    const row = await createRegistration()
    const attempt = () => commitCheckIn({ rawToken: row.token, eventId, staffLabel: 'Gate A' })

    // concurrency-control.test.ts runs a non-atomic check-in through this same
    // harness to confirm it would be caught.
    const results = await raceOnLockedRow(row.id, Array.from({ length: 10 }, () => attempt))

    expect(results.filter((result) => result.status === 'ok')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'already_used')).toHaveLength(9)

    const [stored] = await db.select().from(registrations).where(eq(registrations.id, row.id))
    expect(stored.checkedInAt).not.toBeNull()
    expect(stored.checkedInBy).toBe('Gate A')

    // Every attempt is recorded, not just the one that won.
    expect(await logsFor(row.token)).toHaveLength(10)
  })

  it('records the first check-in and rejects the second', async () => {
    const row = await createRegistration()

    const first = await commitCheckIn({ rawToken: row.token, eventId, staffLabel: 'Gate A' })
    const second = await commitCheckIn({ rawToken: row.token, eventId, staffLabel: 'Gate B' })

    expect(first.status).toBe('ok')
    expect(second.status).toBe('already_used')
    expect(second.registration?.checkedInBy).toBe('Gate A')

    const [stored] = await db.select().from(registrations).where(eq(registrations.id, row.id))
    expect(stored.checkedInBy).toBe('Gate A')
  })

  it('accepts the full ticket URL carried by the QR code', async () => {
    const row = await createRegistration()

    const result = await commitCheckIn({
      rawToken: `https://padel.example.com/t/${row.token}`,
      eventId,
    })

    expect(result.status).toBe('ok')
    expect(result.registration?.fullName).toBe('Test Peserta')
  })

  it.each([
    ['cancelled registrations', { status: 'cancelled' as const }, 'cancelled'],
    ['waitlisted registrations', { status: 'waitlist' as const }, 'cancelled'],
  ])('refuses %s', async (_label, overrides, expected) => {
    const row = await createRegistration(overrides)

    const result = await commitCheckIn({ rawToken: row.token, eventId })

    expect(result.status).toBe(expected)

    const [stored] = await db.select().from(registrations).where(eq(registrations.id, row.id))
    expect(stored.checkedInAt).toBeNull()
  })

  it('reports an unknown token as not found and still logs it', async () => {
    const stray = generateToken()

    const result = await commitCheckIn({ rawToken: stray, eventId })

    expect(result.status).toBe('not_found')
    expect(result.registration).toBeNull()
    // A forged code circulating at the gate is worth seeing in the audit trail.
    expect(await logsFor(stray)).toHaveLength(1)
  })

  it('refuses a ticket issued for another event', async () => {
    const other = await createEvent('Other Event')

    try {
      const [row] = await db
        .insert(registrations)
        .values({
          eventId: other.id,
          token: generateToken(),
          fullName: 'Peserta Lain',
          phone: '628999900001',
        })
        .returning()

      const result = await commitCheckIn({ rawToken: row.token, eventId })

      expect(result.status).toBe('wrong_event')
    } finally {
      await db.delete(events).where(eq(events.id, other.id))
    }
  })
})

describe('previewCheckIn', () => {
  it('never writes, however many times it runs', async () => {
    const row = await createRegistration()

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await previewCheckIn(row.token, eventId)
      expect(result.status).toBe('ready')
      expect(result.canCheckIn).toBe(true)
    }

    const [stored] = await db.select().from(registrations).where(eq(registrations.id, row.id))
    expect(stored.checkedInAt).toBeNull()

    // Scanning the wrong code must leave no trace at all, not even an audit row.
    expect(await logsFor(row.token)).toHaveLength(0)
  })

  it('reports the ticket as spent once it has been used', async () => {
    const row = await createRegistration()

    expect((await previewCheckIn(row.token, eventId)).canCheckIn).toBe(true)

    await commitCheckIn({ rawToken: row.token, eventId, staffLabel: 'Gate A' })

    const after = await previewCheckIn(row.token, eventId)
    expect(after.status).toBe('already_used')
    expect(after.canCheckIn).toBe(false)
    expect(after.registration?.checkedInBy).toBe('Gate A')
  })

  it.each([
    ['an unknown token', () => generateToken(), 'not_found'],
    ['a malformed token', () => 'not a token!', 'not_found'],
  ])('reports %s as %s', async (_label, makeToken, expected) => {
    const result = await previewCheckIn(makeToken(), eventId)

    expect(result.status).toBe(expected)
    expect(result.canCheckIn).toBe(false)
    expect(result.registration).toBeNull()
  })
})

describe('getManifest', () => {
  it('lists only admissible registrations, ordered by name', async () => {
    await createRegistration({ fullName: 'Citra Dewi' })
    await createRegistration({ fullName: 'Agus Salim' })
    await createRegistration({ fullName: 'Batal Peserta', status: 'cancelled' })
    await createRegistration({ fullName: 'Tunggu Peserta', status: 'waitlist' })

    const manifest = await getManifest(eventId)

    expect(manifest.map((entry) => entry.n)).toEqual(['Agus Salim', 'Citra Dewi'])
  })

  it('carries the check-in time once a ticket has been used', async () => {
    const row = await createRegistration()

    expect((await getManifest(eventId))[0].c).toBeNull()

    await commitCheckIn({ rawToken: row.token, eventId, staffLabel: 'Gate A' })

    const [entry] = await getManifest(eventId)
    expect(entry.t).toBe(row.token)
    expect(entry.c).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('leaves out registrations for other events', async () => {
    const other = await createEvent('Other Event')

    try {
      await db.insert(registrations).values({
        eventId: other.id,
        token: generateToken(),
        fullName: 'Peserta Lain',
        phone: '628999900002',
      })

      expect(await getManifest(eventId)).toEqual([])
    } finally {
      await db.delete(events).where(eq(events.id, other.id))
    }
  })
})

describe('commitCheckInBatch', () => {
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000)

  it('lets the earlier of two scans win, whatever order they arrive in', async () => {
    const row = await createRegistration()
    const earlier = minutesAgo(10)
    const later = minutesAgo(5)

    const { results, summary } = await commitCheckInBatch({
      eventId,
      items: [
        { rawToken: row.token, clientScannedAt: later, staffLabel: 'Gate B' },
        { rawToken: row.token, clientScannedAt: earlier, staffLabel: 'Gate A' },
      ],
    })

    expect(results.map((result) => result.status)).toEqual(['ok', 'already_used'])
    expect(summary).toMatchObject({ ok: 1, alreadyUsed: 1 })

    const [stored] = await db.select().from(registrations).where(eq(registrations.id, row.id))
    expect(stored.checkedInBy).toBe('Gate A')
    // A plausible device time is kept, so the record shows the real arrival.
    expect(stored.checkedInAt?.toISOString()).toBe(earlier.toISOString())
  })

  it('reports each item on its own and carries on past a refused ticket', async () => {
    const first = await createRegistration()
    const cancelled = await createRegistration({ status: 'cancelled' })
    const second = await createRegistration()
    const start = minutesAgo(1).getTime()

    const { results, summary } = await commitCheckInBatch({
      eventId,
      items: [
        { rawToken: first.token, clientScannedAt: new Date(start) },
        { rawToken: generateToken(), clientScannedAt: new Date(start + 1000) },
        { rawToken: cancelled.token, clientScannedAt: new Date(start + 2000) },
        { rawToken: second.token, clientScannedAt: new Date(start + 3000) },
      ],
    })

    expect(results.map((result) => result.status)).toEqual(['ok', 'not_found', 'cancelled', 'ok'])
    expect(summary).toEqual({
      ok: 2,
      alreadyUsed: 0,
      notFound: 1,
      cancelled: 1,
      wrongEvent: 0,
      error: 0,
    })
  })

  it('marks every synced attempt as offline in the audit log', async () => {
    const row = await createRegistration()
    const scannedAt = minutesAgo(2)

    await commitCheckInBatch({
      eventId,
      staffLabel: 'Gate A',
      items: [{ rawToken: row.token, clientScannedAt: scannedAt }],
    })

    const [log] = await logsFor(row.token)
    expect(log.syncedOffline).toBe(true)
    expect(log.clientScannedAt?.toISOString()).toBe(scannedAt.toISOString())
    expect(log.staffLabel).toBe('Gate A')
  })

  it.each([
    ['a phone clock running ahead', 3 * 60 * 1000],
    ['a scan older than twelve hours', -13 * 60 * 60 * 1000],
  ])('falls back to the server clock for %s', async (_label, offsetMs) => {
    const row = await createRegistration()
    const now = new Date()

    await commitCheckInBatch({
      eventId,
      now,
      items: [{ rawToken: row.token, clientScannedAt: new Date(now.getTime() + offsetMs) }],
    })

    const [stored] = await db.select().from(registrations).where(eq(registrations.id, row.id))
    expect(stored.checkedInAt?.toISOString()).toBe(now.toISOString())
  })
})
