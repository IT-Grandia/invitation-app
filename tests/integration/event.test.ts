import { inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { GET as scanSession } from '@/app/api/scan/session/route'
import { db } from '@/lib/db'
import { getPublishedEvent } from '@/lib/db/queries/event'
import { registerParticipant } from '@/lib/db/queries/registrations'
import { events } from '@/lib/db/schema'
import type { NewEvent } from '@/lib/db/schema'

const created: string[] = []

/**
 * Dated years before the seed and the events other test files create, so the
 * event under test is always the earliest one getPublishedEvent can pick. The
 * registration window is wide open, leaving status as the only thing that can
 * refuse a registration.
 */
async function createEvent(overrides: Partial<NewEvent> = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const [event] = await db
    .insert(events)
    .values({
      slug: `event-test-${suffix}`,
      name: 'Event Test',
      venueName: 'Test Venue',
      startsAt: new Date('2000-01-01T01:00:00.000Z'),
      endsAt: new Date('2000-01-01T10:00:00.000Z'),
      registrationOpensAt: new Date('1999-12-01T00:00:00.000Z'),
      registrationClosesAt: new Date('2099-12-31T00:00:00.000Z'),
      status: 'published',
      ...overrides,
    })
    .returning()

  created.push(event.id)

  return event
}

const earlier = {
  startsAt: new Date('1999-01-01T01:00:00.000Z'),
  endsAt: new Date('1999-01-01T10:00:00.000Z'),
}

afterEach(async () => {
  const ids = created.splice(0)

  if (ids.length > 0) {
    await db.delete(events).where(inArray(events.id, ids))
  }
})

describe('getPublishedEvent', () => {
  it('still shows an event once its registration is closed', async () => {
    const event = await createEvent({ status: 'closed' })

    expect((await getPublishedEvent())?.id).toBe(event.id)
  })

  it('never shows a draft or archived event, however early it starts', async () => {
    await createEvent({ status: 'draft', ...earlier })
    await createEvent({ status: 'archived', ...earlier })
    const published = await createEvent()

    expect((await getPublishedEvent())?.id).toBe(published.id)
  })

  it('returns details and rundown checked against their shape', async () => {
    const event = await createEvent({
      details: [
        { label: 'Dress code', value: 'Baju olahraga bebas' },
        { label: 'Isian yang belum lengkap' },
      ],
      rundown: [{ time: '08.00', activity: 'Registrasi ulang' }],
    })

    const shown = await getPublishedEvent()

    expect(shown?.id).toBe(event.id)
    expect(shown?.details).toEqual([{ label: 'Dress code', value: 'Baju olahraga bebas' }])
    expect(shown?.rundown).toEqual([{ time: '08.00', activity: 'Registrasi ulang' }])
  })
})

describe('a closed event', () => {
  it('keeps the scanner open', async () => {
    await createEvent({ status: 'closed', name: 'Event Ditutup' })

    const response = await scanSession(
      new Request('http://localhost/api/scan/session', {
        headers: { authorization: `Bearer ${process.env.STAFF_KEY}` },
      }),
    )

    expect(response.status).toBe(200)
    expect((await response.json()).event.name).toBe('Event Ditutup')
  })

  it('refuses new registrations', async () => {
    const event = await createEvent({ status: 'closed' })

    const result = await registerParticipant({
      eventId: event.id,
      fullName: 'Peserta Terlambat',
      phone: '628999777001',
    })

    expect(result.status).toBe('registration_closed')
  })
})

describe('events table', () => {
  it('gives a new event an empty details list and rundown', async () => {
    const event = await createEvent()

    expect(event.details).toEqual([])
    expect(event.rundown).toEqual([])
  })

  it.each([
    ['details', { details: { label: 'Format', value: 'Santai' } }],
    ['rundown', { rundown: { time: '08.00', activity: 'Registrasi ulang' } }],
  ])('refuses %s that is not a list', async (column, overrides) => {
    await expect(createEvent(overrides)).rejects.toMatchObject({
      cause: { constraint_name: `events_${column}_array` },
    })
  })
})
