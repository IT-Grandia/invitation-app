import type { QueuedCheckIn } from './offline-store'
import type { Manifest } from './scanner-search'
import { extractToken, ticketNumber } from './token'

export type OfflinePreview = {
  status: 'ready' | 'already_used' | 'not_found'
  canCheckIn: boolean
  registration: {
    ticketNumber: string
    fullName: string
    checkedInAt: string | null
    checkedInBy: string | null
  } | null
}

export type SyncTally = {
  synced: number
  alreadyRecorded: number
  refused: number
  failed: number
}

/**
 * Answers what the preview endpoint would, from the list kept on the device.
 * Cancelled and waitlisted registrations are left out of that list, so they are
 * refused here as unknown tickets.
 */
export function previewFromManifest(manifest: Manifest, rawToken: string): OfflinePreview {
  const token = extractToken(rawToken)
  const entry = token ? manifest.entries.find((candidate) => candidate.t === token) : undefined

  if (!entry) {
    return { status: 'not_found', canCheckIn: false, registration: null }
  }

  const registration = {
    ticketNumber: ticketNumber(entry.t),
    fullName: entry.n,
    checkedInAt: entry.c,
    checkedInBy: null,
  }

  return entry.c
    ? { status: 'already_used', canCheckIn: false, registration }
    : { status: 'ready', canCheckIn: true, registration }
}

/**
 * A ticket this device has already admitted but not yet sent is spent, whatever
 * the server still believes. Returns null for a ticket that is not waiting.
 */
export function previewFromQueue(
  queue: QueuedCheckIn[],
  manifest: Manifest | null,
  rawToken: string,
  pendingLabel: string,
): OfflinePreview | null {
  const token = extractToken(rawToken)
  const queued = token ? queue.find((item) => item.token === token) : undefined

  if (!token || !queued) {
    return null
  }

  const entry = manifest?.entries.find((candidate) => candidate.t === token)

  return {
    status: 'already_used',
    canCheckIn: false,
    registration: {
      ticketNumber: ticketNumber(token),
      fullName: entry?.n ?? ticketNumber(token),
      checkedInAt: queued.clientScannedAt,
      checkedInBy: pendingLabel,
    },
  }
}

/** Keeps the first recorded time of a ticket that was already used. */
export function markCheckedIn(manifest: Manifest, token: string, at: string): Manifest {
  return {
    ...manifest,
    entries: manifest.entries.map((entry) =>
      entry.t === token && !entry.c ? { ...entry, c: at } : entry,
    ),
  }
}

/** Shows check-ins still waiting on the device as done in a list fetched from the server. */
export function overlayPending(manifest: Manifest, queue: QueuedCheckIn[]): Manifest {
  if (queue.length === 0) {
    return manifest
  }

  const pending = new Map(queue.map((item) => [item.token, item.clientScannedAt]))

  return {
    ...manifest,
    entries: manifest.entries.map((entry) => {
      const at = pending.get(entry.t)
      return !entry.c && at ? { ...entry, c: at } : entry
    }),
  }
}

export function statsFromManifest(manifest: Manifest): { checkedIn: number; total: number } {
  return {
    checkedIn: manifest.entries.filter((entry) => entry.c !== null).length,
    total: manifest.entries.length,
  }
}

/** One pending check-in per ticket; confirming the same ticket again changes nothing. */
export function enqueue(queue: QueuedCheckIn[], item: QueuedCheckIn): QueuedCheckIn[] {
  return queue.some((queued) => queued.token === item.token) ? queue : [...queue, item]
}

/**
 * Removes every item the server gave a final answer for. Items it failed on stay,
 * and so does anything queued while the request was out, since those are not in
 * the results at all.
 */
export function applySyncResults(
  queue: QueuedCheckIn[],
  results: { token: string; status: string }[],
): { remaining: QueuedCheckIn[]; tally: SyncTally } {
  const tally: SyncTally = { synced: 0, alreadyRecorded: 0, refused: 0, failed: 0 }
  const settled = new Set<string>()

  for (const result of results) {
    if (result.status === 'error') {
      tally.failed += 1
      continue
    }

    settled.add(result.token)

    if (result.status === 'ok') {
      tally.synced += 1
    } else if (result.status === 'already_used') {
      tally.alreadyRecorded += 1
    } else {
      tally.refused += 1
    }
  }

  return { remaining: queue.filter((item) => !settled.has(item.token)), tally }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size))
  }

  return chunks
}
