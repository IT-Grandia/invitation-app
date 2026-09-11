import { asc, eq, inArray, sql } from 'drizzle-orm'

import { parseEventDetails, parseRundown } from '../../validation/event-content'
import type { EventDetail, RundownEntry } from '../../validation/event-content'
import { db } from '../index'
import { events, registrations } from '../schema'
import type { Event } from '../schema'

export type EventWithContent = Omit<Event, 'details' | 'rundown'> & {
  details: EventDetail[]
  rundown: RundownEntry[]
}

function withContent(event: Event): EventWithContent {
  return {
    ...event,
    details: parseEventDetails(event.details),
    rundown: parseRundown(event.rundown),
  }
}

/**
 * The application serves a single event at a time. Until a slug appears in the
 * routes, the earliest event that is published or closed is the one on show.
 *
 * Closing an event stops registration only, which the registration route checks
 * for itself; the invitation and the scanner stay up. Once a later event is
 * published, earlier ones must be archived rather than left closed, or they would
 * still be the one shown.
 */
export async function getPublishedEvent(): Promise<EventWithContent | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(inArray(events.status, ['published', 'closed']))
    .orderBy(asc(events.startsAt))
    .limit(1)

  return event ? withContent(event) : null
}

export async function getEventBySlug(slug: string): Promise<EventWithContent | null> {
  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)

  return event ? withContent(event) : null
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
