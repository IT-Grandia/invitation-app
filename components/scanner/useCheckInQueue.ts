'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchOrNull } from '@/lib/network'
import { applySyncResults, chunk, enqueue } from '@/lib/offline-checkin'
import type { SyncTally } from '@/lib/offline-checkin'
import { loadQueue, saveQueue } from '@/lib/offline-store'
import type { QueuedCheckIn } from '@/lib/offline-store'
import { loadStoredKey } from '@/lib/scanner-session'

const SYNC_INTERVAL_MS = 15_000
// Well under the batch limit, so one request stays inside the route's time
// budget even on a slow connection.
const SYNC_CHUNK_SIZE = 50
const SYNC_TIMEOUT_MS = 25_000

export type SyncReport = SyncTally & { at: string }

type Options = {
  onUnauthorised: () => void
  onSynced: (report: SyncReport) => void
}

function initialReachability(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function useCheckInQueue({ onUnauthorised, onSynced }: Options) {
  const [pending, setPending] = useState(() => loadQueue().length)
  const [syncing, setSyncing] = useState(false)
  const [reachable, setReachable] = useState(initialReachability)

  const reachableRef = useRef(reachable)
  const syncingRef = useRef(false)
  const callbacksRef = useRef({ onUnauthorised, onSynced })

  useEffect(() => {
    callbacksRef.current = { onUnauthorised, onSynced }
  }, [onUnauthorised, onSynced])

  const markReachable = useCallback((value: boolean) => {
    reachableRef.current = value
    setReachable(value)
  }, [])

  const reloadPending = useCallback(() => {
    setPending(loadQueue().length)
  }, [])

  const syncNow = useCallback(async () => {
    const key = loadStoredKey()
    const queued = loadQueue()

    setPending(queued.length)

    if (syncingRef.current || !key || queued.length === 0) {
      return
    }

    syncingRef.current = true
    setSyncing(true)

    const tally: SyncTally = { synced: 0, alreadyRecorded: 0, refused: 0, failed: 0 }

    try {
      for (const items of chunk(queued, SYNC_CHUNK_SIZE)) {
        const response = await fetchOrNull(
          '/api/checkin/batch',
          {
            method: 'POST',
            headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
            body: JSON.stringify({ items }),
            cache: 'no-store',
          },
          SYNC_TIMEOUT_MS,
        )

        if (!response) {
          markReachable(false)
          break
        }

        markReachable(true)

        if (response.status === 401) {
          callbacksRef.current.onUnauthorised()
          break
        }

        const body = await response.json().catch(() => null)

        // Anything short of a readable answer leaves the queue in place for the
        // next attempt. Resending is safe: a ticket the server already recorded
        // comes back as already used rather than being recorded twice.
        if (!response.ok || !body || !Array.isArray(body.results)) {
          break
        }

        // Re-read instead of reusing the snapshot, so check-ins confirmed while
        // this request was out are not dropped by it.
        const { remaining, tally: part } = applySyncResults(loadQueue(), body.results)
        saveQueue(remaining)

        tally.synced += part.synced
        tally.alreadyRecorded += part.alreadyRecorded
        tally.refused += part.refused
        tally.failed += part.failed
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
      setPending(loadQueue().length)
    }

    if (tally.synced + tally.alreadyRecorded + tally.refused + tally.failed > 0) {
      callbacksRef.current.onSynced({ ...tally, at: new Date().toISOString() })
    }
  }, [markReachable])

  const enqueueCheckIn = useCallback(
    (item: QueuedCheckIn): boolean => {
      const next = enqueue(loadQueue(), item)

      if (!saveQueue(next)) {
        return false
      }

      setPending(next.length)

      if (reachableRef.current) {
        void syncNow()
      }

      return true
    },
    [syncNow],
  )

  useEffect(() => {
    const onOnline = () => {
      markReachable(true)
      void syncNow()
    }

    const onOffline = () => markReachable(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Doubles as a reachability probe. navigator.onLine stays true on a network
    // that shows signal but has no route out, which is the usual state at a venue.
    const interval = window.setInterval(() => {
      if (loadQueue().length > 0) {
        void syncNow()
      }
    }, SYNC_INTERVAL_MS)

    // A queue left over from before a reload is sent as soon as the page is back.
    const initial = window.setTimeout(() => void syncNow(), 0)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.clearInterval(interval)
      window.clearTimeout(initial)
    }
  }, [markReachable, syncNow])

  useEffect(() => {
    // Without a service worker the scanner cannot load again until signal
    // returns, so closing the tab with check-ins waiting takes the gate out of
    // action until then.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (loadQueue().length > 0) {
        event.preventDefault()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)

    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  return { pending, syncing, reachable, markReachable, reloadPending, enqueueCheckIn, syncNow }
}
