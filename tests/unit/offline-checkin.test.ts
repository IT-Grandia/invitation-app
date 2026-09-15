import { describe, expect, it } from 'vitest'

import {
  applySyncResults,
  chunk,
  enqueue,
  markCheckedIn,
  overlayPending,
  previewFromManifest,
  previewFromQueue,
  statsFromManifest,
} from '@/lib/offline-checkin'
import type { QueuedCheckIn } from '@/lib/offline-store'
import type { Manifest } from '@/lib/scanner-search'

const A = 'SEEDA0000000000000000000'
const B = 'SEEDB0000000000000000000'
const C = 'SEEDC0000000000000000000'
const D = 'SEEDD0000000000000000000'
const E = 'SEEDE0000000000000000000'

const manifest: Manifest = {
  eventId: 'event-1',
  eventName: 'Padel Day 2026',
  updatedAt: '2026-09-26T00:00:00.000Z',
  total: 3,
  entries: [
    { t: A, n: 'Budi Santoso', c: null, g: 'club_79' },
    // No community: an entry cached before the column existed.
    { t: B, n: 'Siti Aminah', c: null },
    { t: C, n: 'Andi Wijaya', c: '2026-09-26T01:05:00.000Z' },
  ],
}

const queued = (token: string, at = '2026-09-26T01:10:00.000Z'): QueuedCheckIn => ({
  token,
  clientScannedAt: at,
})

describe('previewFromManifest', () => {
  it('reports an unused ticket as ready', () => {
    expect(previewFromManifest(manifest, A)).toEqual({
      status: 'ready',
      canCheckIn: true,
      registration: {
        ticketNumber: 'SEEDA000',
        fullName: 'Budi Santoso',
        community: 'club_79',
        checkedInAt: null,
        checkedInBy: null,
      },
    })
  })

  it('leaves the community empty for a list cached before it existed', () => {
    expect(previewFromManifest(manifest, B).registration?.community).toBeNull()
  })

  it('reports a used ticket with the time it was used', () => {
    const preview = previewFromManifest(manifest, C)

    expect(preview.status).toBe('already_used')
    expect(preview.canCheckIn).toBe(false)
    expect(preview.registration?.checkedInAt).toBe('2026-09-26T01:05:00.000Z')
  })

  it('reads the token out of the full ticket URL in a QR code', () => {
    expect(previewFromManifest(manifest, `https://padel.example.com/t/${A}`).status).toBe('ready')
  })

  it.each([
    ['an unknown token', 'ZZZZZZZZZZZZZZZZZZZZZZZZ'],
    ['a malformed code', 'not a token!'],
  ])('refuses %s', (_label, raw) => {
    expect(previewFromManifest(manifest, raw)).toEqual({
      status: 'not_found',
      canCheckIn: false,
      registration: null,
    })
  })
})

describe('previewFromQueue', () => {
  it('returns null for a ticket that is not waiting', () => {
    expect(previewFromQueue([queued(B)], manifest, A, 'HP ini')).toBeNull()
  })

  it('reports a waiting ticket as spent, attributed to this device', () => {
    expect(previewFromQueue([queued(A)], manifest, `https://padel.example.com/t/${A}`, 'HP ini')).toEqual(
      {
        status: 'already_used',
        canCheckIn: false,
        registration: {
          ticketNumber: 'SEEDA000',
          fullName: 'Budi Santoso',
          community: 'club_79',
          checkedInAt: '2026-09-26T01:10:00.000Z',
          checkedInBy: 'HP ini',
        },
      },
    )
  })

  it('falls back to the ticket number when no list is available', () => {
    expect(previewFromQueue([queued(A)], null, A, 'HP ini')?.registration?.fullName).toBe('SEEDA000')
  })
})

describe('markCheckedIn', () => {
  it('marks an unused ticket without touching the original list', () => {
    const next = markCheckedIn(manifest, A, '2026-09-26T01:20:00.000Z')

    expect(next.entries[0].c).toBe('2026-09-26T01:20:00.000Z')
    expect(manifest.entries[0].c).toBeNull()
  })

  it('keeps the first recorded time of a ticket already used', () => {
    expect(markCheckedIn(manifest, C, '2026-09-26T09:00:00.000Z').entries[2].c).toBe(
      '2026-09-26T01:05:00.000Z',
    )
  })
})

describe('overlayPending', () => {
  it('shows waiting check-ins as done and leaves the rest alone', () => {
    const next = overlayPending(manifest, [queued(B), queued(C, '2026-09-26T09:00:00.000Z')])

    expect(next.entries.map((entry) => entry.c)).toEqual([
      null,
      '2026-09-26T01:10:00.000Z',
      '2026-09-26T01:05:00.000Z',
    ])
  })

  it('returns the same list when nothing is waiting', () => {
    expect(overlayPending(manifest, [])).toBe(manifest)
  })
})

describe('statsFromManifest', () => {
  it('counts used tickets against the whole list', () => {
    expect(statsFromManifest(manifest)).toEqual({ checkedIn: 1, total: 3 })
  })
})

describe('enqueue', () => {
  it('adds a new ticket', () => {
    expect(enqueue([queued(A)], queued(B))).toHaveLength(2)
  })

  it('keeps the earlier entry when the same ticket is confirmed again', () => {
    const first = queued(A, '2026-09-26T01:00:00.000Z')

    expect(enqueue([first], queued(A, '2026-09-26T02:00:00.000Z'))).toEqual([first])
  })
})

describe('applySyncResults', () => {
  it('clears settled items and keeps failed ones and anything queued meanwhile', () => {
    const queue = [queued(A), queued(B), queued(C), queued(D), queued(E)]

    const { remaining, tally } = applySyncResults(queue, [
      { token: A, status: 'ok' },
      { token: B, status: 'already_used' },
      { token: C, status: 'error' },
      { token: D, status: 'cancelled' },
    ])

    expect(remaining.map((item) => item.token)).toEqual([C, E])
    expect(tally).toEqual({ synced: 1, alreadyRecorded: 1, refused: 1, failed: 1 })
  })

  it.each(['not_found', 'cancelled', 'wrong_event'])('counts %s as refused', (status) => {
    expect(applySyncResults([queued(A)], [{ token: A, status }]).tally.refused).toBe(1)
  })
})

describe('chunk', () => {
  it('splits a queue into requests of at most the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 50)).toEqual([])
  })
})
