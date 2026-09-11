import { describe, expect, it } from 'vitest'

import { qrPresentation, resolveTicketStatus } from '@/lib/ticket-status'

const checkedInAt = new Date('2026-09-26T01:03:25.000Z')

describe('resolveTicketStatus', () => {
  it('reads a confirmed, unused ticket as registered', () => {
    expect(resolveTicketStatus({ status: 'confirmed', checkedInAt: null })).toEqual({
      kind: 'registered',
    })
  })

  it('reads a confirmed, used ticket as checked in with the timestamp', () => {
    expect(resolveTicketStatus({ status: 'confirmed', checkedInAt })).toEqual({
      kind: 'checked_in',
      at: checkedInAt,
    })
  })

  it('reads a waitlisted registration as waitlist', () => {
    expect(resolveTicketStatus({ status: 'waitlist', checkedInAt: null })).toEqual({
      kind: 'waitlist',
    })
  })

  it('reads a cancelled registration as cancelled', () => {
    expect(resolveTicketStatus({ status: 'cancelled', checkedInAt: null })).toEqual({
      kind: 'cancelled',
    })
  })

  it('never reports a cancelled registration as checked in, even with a timestamp', () => {
    expect(resolveTicketStatus({ status: 'cancelled', checkedInAt })).toEqual({
      kind: 'cancelled',
    })
  })
})

describe('qrPresentation', () => {
  it('shows a live QR only for a registered ticket', () => {
    expect(qrPresentation({ kind: 'registered' })).toBe('live')
  })

  it('dims the QR once the ticket has been used', () => {
    expect(qrPresentation({ kind: 'checked_in', at: checkedInAt })).toBe('spent')
  })

  it.each([{ kind: 'cancelled' } as const, { kind: 'waitlist' } as const])(
    'hides the QR for %o',
    (status) => {
      expect(qrPresentation(status)).toBe('hidden')
    },
  )
})
