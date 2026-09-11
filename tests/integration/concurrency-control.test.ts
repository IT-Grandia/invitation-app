import { eq } from 'drizzle-orm'
import { afterAll, expect, it } from 'vitest'

import { db } from '@/lib/db'
import { events, registrations } from '@/lib/db/schema'
import { generateToken } from '@/lib/token'

import { raceOnLockedRow } from './row-lock'

let eventId: string

afterAll(async () => {
  if (eventId) {
    await db.delete(events).where(eq(events.id, eventId))
  }
})

/**
 * A negative control for the atomicity test in checkin.test.ts.
 *
 * Runs the naive read-then-write that test is meant to rule out, through the same
 * harness, and asserts that every attempt gets through. If this ever fails, the
 * harness has stopped making attempts overlap and the atomicity test would pass
 * for a broken implementation.
 */
it('a read-then-write check-in lets every attempt through', async () => {
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

  const results = await raceOnLockedRow(row.id, Array.from({ length: 10 }, () => naiveCheckIn))

  expect(results.filter((result) => result === 'ok')).toHaveLength(10)
})
