import { eq, sql } from 'drizzle-orm'
import { afterAll, expect, it } from 'vitest'

import { db } from '@/lib/db'
import { events, registrations } from '@/lib/db/schema'
import { generateToken } from '@/lib/token'

let eventId: string

afterAll(async () => {
  if (eventId) {
    await db.delete(events).where(eq(events.id, eventId))
  }
})

/**
 * A negative control for the atomicity test in checkin.test.ts.
 *
 * That test is only meaningful if concurrent requests genuinely overlap. This one
 * runs the naive read-then-write it is meant to rule out and asserts that the
 * naive version does let several attempts through. If this ever starts passing
 * only one attempt, the harness has stopped racing and the atomicity test has
 * quietly become worthless.
 */
it('a read-then-write check-in lets more than one attempt through', async () => {
  const [event] = await db
    .insert(events)
    .values({
      slug: `mutation-${Date.now()}`,
      name: 'Mutation Control',
      venueName: 'Test Venue',
      startsAt: new Date('2026-09-26T01:00:00.000Z'),
      endsAt: new Date('2026-09-26T10:00:00.000Z'),
      registrationClosesAt: new Date('2026-09-25T14:00:00.000Z'),
      status: 'draft',
    })
    .returning()

  eventId = event.id

  const [row] = await db
    .insert(registrations)
    .values({
      eventId,
      token: generateToken(),
      fullName: 'Mutation Peserta',
      phone: '628999123456',
    })
    .returning()

  const naiveCheckIn = async () => {
    const [current] = await db.select().from(registrations).where(eq(registrations.id, row.id))

    if (current.checkedInAt) {
      return 'already_used'
    }

    await db
      .update(registrations)
      .set({ checkedInAt: new Date() })
      .where(eq(registrations.id, row.id))

    return 'ok'
  }

  // Connections open lazily, so without this the first attempt finishes before
  // the last one has finished its handshake and no race ever occurs.
  await Promise.all(Array.from({ length: 10 }, () => db.execute(sql`select 1`)))

  const results = await Promise.all(Array.from({ length: 10 }, naiveCheckIn))
  const winners = results.filter((result) => result === 'ok').length

  expect(winners).toBeGreaterThan(1)
})
