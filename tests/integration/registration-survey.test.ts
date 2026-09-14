import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/lib/db'
import { getEventStats } from '@/lib/db/queries/event'
import { events, registrations } from '@/lib/db/schema'
import { generateToken } from '@/lib/token'

let eventId: string
let phoneCounter = 0

beforeEach(async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const [event] = await db
    .insert(events)
    .values({
      slug: `survey-${suffix}`,
      name: 'Survey Test',
      venueName: 'Test Venue',
      startsAt: new Date('2026-09-26T01:00:00.000Z'),
      endsAt: new Date('2026-09-26T10:00:00.000Z'),
      registrationClosesAt: new Date('2026-09-25T14:00:00.000Z'),
      status: 'draft',
    })
    .returning()

  eventId = event.id
})

afterEach(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

async function createRegistration(overrides: Partial<typeof registrations.$inferInsert> = {}) {
  phoneCounter += 1

  const [row] = await db
    .insert(registrations)
    .values({
      eventId,
      token: generateToken(),
      fullName: 'Peserta Survey',
      phone: `628998${String(phoneCounter).padStart(6, '0')}`,
      ...overrides,
    })
    .returning()

  return row
}

describe('registration survey columns', () => {
  it('stores the answers and treats a registration as attending by default', async () => {
    const row = await createRegistration({
      investmentInterests: ['stocks', 'property'],
      community: 'club_79',
    })

    expect(row.investmentInterests).toEqual(['stocks', 'property'])
    expect(row.community).toBe('club_79')
    expect(row.attending).toBe(true)
  })

  it('leaves rows written before the columns existed without answers', async () => {
    const row = await createRegistration()

    expect(row.investmentInterests).toEqual([])
    expect(row.community).toBeNull()
  })

  it.each([
    ['more than two answers', ['gold', 'stocks', 'property']],
    ['an answer that is not offered', ['crypto']],
  ])('refuses %s', async (_label, investmentInterests) => {
    await expect(createRegistration({ investmentInterests })).rejects.toMatchObject({
      cause: { constraint_name: 'registrations_investment_interests_valid' },
    })
  })

  it.each([
    ['an empty community', ''],
    ['a community name that is absurdly long', 'x'.repeat(81)],
  ])('refuses %s', async (_label, community) => {
    await expect(createRegistration({ community })).rejects.toMatchObject({
      cause: { constraint_name: 'registrations_community_length' },
    })
  })
})

describe('getEventStats', () => {
  it('counts the answers to the attendance question', async () => {
    await createRegistration({ attending: true })
    await createRegistration({ attending: true, checkedInAt: new Date(), checkedInBy: 'Gate A' })
    await createRegistration({ attending: false })
    // Only confirmed registrations are counted, whatever they answered.
    await createRegistration({ attending: true, status: 'cancelled' })

    const stats = await getEventStats(eventId)

    expect(stats).toMatchObject({
      registered: 3,
      checkedIn: 1,
      notCheckedIn: 2,
      attending: 2,
      notAttending: 1,
      cancelled: 1,
    })
  })
})
