import { asc, eq, sql } from 'drizzle-orm'

import { db } from '../index'
import { events, registrations } from '../schema'
import type { Event } from '../schema'

/**
 * The application serves a single event at a time. Until a slug appears in the
 * routes, the earliest published event is the one on show.
 */
export async function getPublishedEvent(): Promise<Event | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.status, 'published'))
    .orderBy(asc(events.startsAt))
    .limit(1)

  return event ?? null
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)

  return event ?? null
}

export type EventStats = {
  registered: number
  checkedIn: number
  notCheckedIn: number
  waitlist: number
  cancelled: number
}

// Counted on every call rather than kept in a column. A counter that drifts from
// the rows it summarises is a class of bug nobody notices until the event day.
export async function getEventStats(eventId: string): Promise<EventStats> {
  const [row] = await db
    .select({
      registered: sql<number>`count(*) filter (where ${registrations.status} = 'confirmed')`.mapWith(
        Number,
      ),
      checkedIn:
        sql<number>`count(*) filter (where ${registrations.status} = 'confirmed' and ${registrations.checkedInAt} is not null)`.mapWith(
          Number,
        ),
      waitlist: sql<number>`count(*) filter (where ${registrations.status} = 'waitlist')`.mapWith(
        Number,
      ),
      cancelled: sql<number>`count(*) filter (where ${registrations.status} = 'cancelled')`.mapWith(
        Number,
      ),
    })
    .from(registrations)
    .where(eq(registrations.eventId, eventId))

  return { ...row, notCheckedIn: row.registered - row.checkedIn }
}

/** Null when the event has no capacity limit. */
export function remainingCapacity(capacity: number | null, registered: number): number | null {
  return capacity === null ? null : Math.max(capacity - registered, 0)
}
