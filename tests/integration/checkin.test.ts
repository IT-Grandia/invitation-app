import { eq, gte, sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/lib/db'
import { commitCheckIn, getManifest, previewCheckIn } from '@/lib/db/queries/checkin'
import { checkInLogs, events, registrations } from '@/lib/db/schema'
import type { Registration } from '@/lib/db/schema'
import { generateToken } from '@/lib/token'

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

/**
 * postgres.js opens connections lazily. Without this the first of a batch of
 * concurrent requests completes before the last has finished its handshake, so
 * nothing actually races and a broken implementation would still pass.
 * concurrency-control.test.ts guards that this warm-up keeps working.
 */
async function warmPool(size = 10) {
  await Promise.all(Array.from({ length: size }, () => db.execute(sql`select 1`)))
}

beforeEach(async () => {
  startedAt = new Date()
  const event = await createEvent()
  eventId = event.id
  await warmPool()
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

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        commitCheckIn({ rawToken: row.token, eventId, staffLabel: 'Gate A' }),
      ),
    )

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
