import type { Manifest, ManifestEntry } from './scanner-search'

const MANIFEST_KEY = 'padel_manifest'
const QUEUE_KEY = 'padel_checkin_queue'

export type CachedManifest = {
  manifest: Manifest
  cachedAt: string
}

export type QueuedCheckIn = {
  token: string
  clientScannedAt: string
  staffLabel?: string
}

function storage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function read(key: string): unknown {
  try {
    const raw = storage()?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  const target = storage()

  if (!target) {
    return false
  }

  try {
    target.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isEntry(value: unknown): value is ManifestEntry {
  return (
    isRecord(value) &&
    typeof value.t === 'string' &&
    typeof value.n === 'string' &&
    (value.c === null || typeof value.c === 'string')
  )
}

function isQueued(value: unknown): value is QueuedCheckIn {
  return (
    isRecord(value) &&
    typeof value.token === 'string' &&
    typeof value.clientScannedAt === 'string' &&
    (value.staffLabel === undefined || typeof value.staffLabel === 'string')
  )
}

// Stored data outlives deployments, so anything that no longer has the expected
// shape is treated as absent rather than trusted.
export function loadCachedManifest(): CachedManifest | null {
  const value = read(MANIFEST_KEY)

  if (!isRecord(value)) {
    return null
  }

  const cachedAt = value.cachedAt
  const manifest = value.manifest

  if (
    typeof cachedAt !== 'string' ||
    !isRecord(manifest) ||
    typeof manifest.eventId !== 'string' ||
    typeof manifest.eventName !== 'string' ||
    !Array.isArray(manifest.entries) ||
    !manifest.entries.every(isEntry)
  ) {
    return null
  }

  return {
    cachedAt,
    manifest: {
      eventId: manifest.eventId,
      eventName: manifest.eventName,
      updatedAt: typeof manifest.updatedAt === 'string' ? manifest.updatedAt : cachedAt,
      total: manifest.entries.length,
      entries: manifest.entries,
    },
  }
}

export function storeCachedManifest(manifest: Manifest, cachedAt: string): boolean {
  return write(MANIFEST_KEY, { manifest, cachedAt })
}

export function loadQueue(): QueuedCheckIn[] {
  const value = read(QUEUE_KEY)

  return Array.isArray(value) ? value.filter(isQueued) : []
}

/**
 * Returns false when the device refused to store the queue. A check-in the
 * officer believes is saved but is not would be lost without a trace, so
 * callers have to surface this rather than carry on.
 */
export function saveQueue(queue: QueuedCheckIn[]): boolean {
  return write(QUEUE_KEY, queue)
}

/** Removes the participant list and any unsent check-ins from this device. */
export function clearOfflineData(): void {
  const target = storage()

  try {
    target?.removeItem(MANIFEST_KEY)
    target?.removeItem(QUEUE_KEY)
  } catch {
    // Storage that refuses removal leaves nothing further to try from here.
  }
}
