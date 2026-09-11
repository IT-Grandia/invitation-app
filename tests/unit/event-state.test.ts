import { describe, expect, it } from 'vitest'

import { resolveRegistrationState } from '@/lib/event-state'

// 26 Sep 2026, 08:00-17:00 WIB; registration 9 Sep -> 25 Sep 21:00 WIB.
const event = {
  status: 'published',
  endsAt: new Date('2026-09-26T10:00:00.000Z'),
  registrationOpensAt: new Date('2026-09-09T00:00:00.000Z'),
  registrationClosesAt: new Date('2026-09-25T14:00:00.000Z'),
  capacity: null as number | null,
}

const duringWindow = new Date('2026-09-15T05:00:00.000Z')

describe('resolveRegistrationState', () => {
  it('is open with no seat count when capacity is unlimited', () => {
    expect(resolveRegistrationState(event, 32, duringWindow)).toEqual({
      kind: 'open',
      remaining: null,
    })
  })

  it('is open with the remaining count when capacity is set', () => {
    expect(resolveRegistrationState({ ...event, capacity: 60 }, 48, duringWindow)).toEqual({
      kind: 'open',
      remaining: 12,
    })
  })

  it('is full once registrations reach capacity', () => {
    expect(resolveRegistrationState({ ...event, capacity: 60 }, 60, duringWindow)).toEqual({
      kind: 'full',
    })
  })

  it('never reports a negative remaining count', () => {
    expect(resolveRegistrationState({ ...event, capacity: 60 }, 63, duringWindow)).toEqual({
      kind: 'full',
    })
  })

  it('is not open yet before the registration window', () => {
    expect(
      resolveRegistrationState(event, 0, new Date('2026-09-01T00:00:00.000Z')),
    ).toEqual({ kind: 'not_open_yet', opensAt: event.registrationOpensAt })
  })

  it('is closed after the registration window, even with seats left', () => {
    expect(
      resolveRegistrationState({ ...event, capacity: 60 }, 10, new Date('2026-09-25T15:00:00.000Z')),
    ).toEqual({ kind: 'closed' })
  })

  it('is closed when the committee closed it early, even inside the window', () => {
    expect(resolveRegistrationState({ ...event, status: 'closed' }, 10, duringWindow)).toEqual({
      kind: 'closed',
    })
  })

  it('is past once the event has ended, whatever the other columns say', () => {
    const afterEvent = new Date('2026-09-26T12:00:00.000Z')

    expect(resolveRegistrationState(event, 10, afterEvent)).toEqual({ kind: 'past' })
    expect(resolveRegistrationState({ ...event, status: 'closed' }, 10, afterEvent)).toEqual({
      kind: 'past',
    })
    expect(
      resolveRegistrationState({ ...event, registrationClosesAt: new Date('2027-01-01') }, 10, afterEvent),
    ).toEqual({ kind: 'past' })
  })

  it('treats the exact opening instant as open', () => {
    expect(resolveRegistrationState(event, 0, event.registrationOpensAt)).toEqual({
      kind: 'open',
      remaining: null,
    })
  })
})
