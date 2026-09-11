import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearOfflineData,
  loadCachedManifest,
  loadQueue,
  saveQueue,
  storeCachedManifest,
} from '@/lib/offline-store'
import type { Manifest } from '@/lib/scanner-search'

class MemoryStorage {
  private items = new Map<string, string>()

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.items.set(key, String(value))
  }

  removeItem(key: string) {
    this.items.delete(key)
  }
}

let store: MemoryStorage

beforeEach(() => {
  store = new MemoryStorage()
  vi.stubGlobal('window', { localStorage: store })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const manifest: Manifest = {
  eventId: 'event-1',
  eventName: 'Padel Day 2026',
  updatedAt: '2026-09-26T00:00:00.000Z',
  total: 2,
  entries: [
    { t: 'SEEDA0000000000000000000', n: 'Budi Santoso', c: null },
    { t: 'SEEDC0000000000000000000', n: 'Andi Wijaya', c: '2026-09-26T01:05:00.000Z' },
  ],
}

const item = { token: 'SEEDA0000000000000000000', clientScannedAt: '2026-09-26T01:00:00.000Z' }

describe('cached manifest', () => {
  it('round-trips through storage', () => {
    expect(storeCachedManifest(manifest, '2026-09-26T00:30:00.000Z')).toBe(true)
    expect(loadCachedManifest()).toEqual({ manifest, cachedAt: '2026-09-26T00:30:00.000Z' })
  })

  it('is absent when nothing was stored', () => {
    expect(loadCachedManifest()).toBeNull()
  })

  it.each([
    ['corrupted JSON', '{not json'],
    ['a different shape', JSON.stringify({ cachedAt: 'x', manifest: { entries: 'nope' } })],
    [
      'an entry without a name',
      JSON.stringify({
        cachedAt: 'x',
        manifest: { eventId: 'e', eventName: 'n', entries: [{ t: 'a', c: null }] },
      }),
    ],
  ])('treats %s as absent', (_label, raw) => {
    store.setItem('padel_manifest', raw)

    expect(loadCachedManifest()).toBeNull()
  })
})

describe('check-in queue', () => {
  it('round-trips through storage', () => {
    const queue = [item, { ...item, token: 'SEEDB0000000000000000000', staffLabel: 'Gate A' }]

    expect(saveQueue(queue)).toBe(true)
    expect(loadQueue()).toEqual(queue)
  })

  it('keeps valid items and drops malformed ones', () => {
    store.setItem('padel_checkin_queue', JSON.stringify([item, { token: 42 }, null]))

    expect(loadQueue()).toEqual([item])
  })

  it('reports failure when the device refuses to store it', () => {
    store.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }

    expect(saveQueue([item])).toBe(false)
  })

  it('is empty outside the browser', () => {
    vi.unstubAllGlobals()

    expect(loadQueue()).toEqual([])
  })
})

describe('clearOfflineData', () => {
  it('removes the list and the queue but leaves the staff key alone', () => {
    storeCachedManifest(manifest, '2026-09-26T00:30:00.000Z')
    saveQueue([item])
    store.setItem('padel_staff_key', 'secret')

    clearOfflineData()

    expect(loadCachedManifest()).toBeNull()
    expect(loadQueue()).toEqual([])
    expect(store.getItem('padel_staff_key')).toBe('secret')
  })
})
