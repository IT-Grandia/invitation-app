'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchOrNull } from '@/lib/network'
import {
  markCheckedIn,
  overlayPending,
  previewFromManifest,
  previewFromQueue,
  statsFromManifest,
} from '@/lib/offline-checkin'
import {
  clearOfflineData,
  loadCachedManifest,
  loadQueue,
  storeCachedManifest,
} from '@/lib/offline-store'
import {
  clearStoredKey,
  loadStaffLabel,
  loadStoredKey,
  readKeyFromFragment,
  storeKey,
  storeStaffLabel,
  stripFragment,
} from '@/lib/scanner-session'
import type { Manifest } from '@/lib/scanner-search'
import { extractToken } from '@/lib/token'

import { CameraView } from './CameraView'
import { ConnectionStatus } from './ConnectionStatus'
import { KeyGate } from './KeyGate'
import { ManualSearch } from './ManualSearch'
import { ResultOverlay } from './ResultOverlay'
import type { OverlayState } from './ResultOverlay'
import { StaffLabel } from './StaffLabel'
import { SyncToast } from './SyncToast'
import type { Preview, Session, Stats } from './types'
import { useCheckInQueue } from './useCheckInQueue'
import type { SyncReport } from './useCheckInQueue'

type Gate = 'checking' | 'locked' | 'ready'
type View = 'scan' | 'search'
type RefreshOutcome = 'ok' | 'unreachable' | 'unauthorised' | 'failed'

const DONE_DISMISS_MS = 1500
const QUEUED_DISMISS_MS = 2500
const TOAST_DISMISS_MS = 6000
const SCAN_VIBRATION_MS = 60
const MANIFEST_REFRESH_MS = 2 * 60 * 1000

// Short enough that an officer is not left waiting at the gate on a stalled
// connection; past this the scanner answers from the device instead.
const PREVIEW_TIMEOUT_MS = 5000
const CHECKIN_TIMEOUT_MS = 8000
const SESSION_TIMEOUT_MS = 8000
const MANIFEST_TIMEOUT_MS = 10000

const PENDING_LABEL = 'HP ini (belum terkirim)'

const EXPIRED_KEY = 'Kode petugas sudah tidak berlaku. Minta kode baru ke koordinator.'
const UNREACHABLE = 'Tidak bisa menghubungi server. Periksa koneksi, lalu coba lagi.'
const NO_OFFLINE_DATA =
  'Tidak ada sinyal, dan daftar peserta belum pernah tersimpan di HP ini. Sambungkan internet sekali, lalu coba lagi.'
const STORAGE_REFUSED =
  'HP ini menolak menyimpan data, mungkin karena mode privat atau memori penuh. Check-in belum tercatat, jadi pakai HP lain atau catat manual.'

function withKey(key: string, init?: { method?: string; body?: string }): RequestInit {
  return {
    method: init?.method ?? 'GET',
    body: init?.body,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    cache: 'no-store',
  }
}

export function Scanner() {
  const [gate, setGate] = useState<Gate>('checking')
  const [session, setSession] = useState<Session | null>(null)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [view, setView] = useState<View>('scan')
  const [overlay, setOverlay] = useState<OverlayState | null>(null)
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null)

  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [manifestCachedAt, setManifestCachedAt] = useState<string | null>(null)
  const [manifestLoading, setManifestLoading] = useState(false)
  const [manifestError, setManifestError] = useState<string | null>(null)

  // The ticket on screen is only read when the officer confirms, never rendered.
  const activeTokenRef = useRef<string | null>(null)

  // html5-qrcode reports the same code on consecutive frames, faster than React
  // can re-render and pause the camera, so repeat reads are refused here instead.
  const busyRef = useRef(false)

  const dismissTimerRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const lockOut = useCallback((message: string) => {
    // Unsent check-ins and the cached list stay. A rotated key should cost the
    // officer a re-entry, never the people already admitted.
    clearStoredKey()
    busyRef.current = false
    activeTokenRef.current = null
    setOverlay(null)
    setGate('locked')
    setKeyError(message)
  }, [])

  const lockOutExpired = useCallback(() => lockOut(EXPIRED_KEY), [lockOut])

  const refreshSession = useCallback(async (key: string) => {
    const response = await fetchOrNull('/api/scan/session', withKey(key), SESSION_TIMEOUT_MS)
    const body = response?.ok ? await response.json().catch(() => null) : null

    if (body) {
      setSession(body as Session)
    }
  }, [])

  const refreshManifest = useCallback(async (key: string): Promise<RefreshOutcome> => {
    const response = await fetchOrNull('/api/scan/manifest', withKey(key), MANIFEST_TIMEOUT_MS)

    if (!response) {
      return 'unreachable'
    }

    if (response.status === 401) {
      return 'unauthorised'
    }

    const body = response.ok ? await response.json().catch(() => null) : null

    if (!body) {
      return 'failed'
    }

    // The raw list is what gets cached; waiting check-ins are laid over it each
    // time it is loaded, so a sync that clears them needs no cache rewrite.
    const cachedAt = new Date().toISOString()
    storeCachedManifest(body as Manifest, cachedAt)
    setManifest(overlayPending(body as Manifest, loadQueue()))
    setManifestCachedAt(cachedAt)

    return 'ok'
  }, [])

  const handleSynced = useCallback(
    (report: SyncReport) => {
      const key = loadStoredKey()

      if (key) {
        void refreshSession(key)
        void refreshManifest(key)
      }

      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }

      setSyncReport(report)

      // A refused ticket means someone got in who should not have, so that
      // report stays on screen until the officer closes it.
      if (report.refused === 0) {
        toastTimerRef.current = window.setTimeout(() => setSyncReport(null), TOAST_DISMISS_MS)
      }
    },
    [refreshManifest, refreshSession],
  )

  const { pending, syncing, reachable, markReachable, reloadPending, enqueueCheckIn, syncNow } =
    useCheckInQueue({ onUnauthorised: lockOutExpired, onSynced: handleSynced })

  const enterOffline = useCallback(
    (key: string | null) => {
      const cached = loadCachedManifest()

      // Only a device that has already fetched the list can open offline, and the
      // list itself can only be fetched with a valid key.
      if (!key || !cached) {
        setGate('locked')
        setKeyError(key ? NO_OFFLINE_DATA : null)
        return
      }

      const list = overlayPending(cached.manifest, loadQueue())

      markReachable(false)
      setManifest(list)
      setManifestCachedAt(cached.cachedAt)
      setSession({ event: { name: list.eventName }, stats: statsFromManifest(list) })
      setGate('ready')
    },
    [markReachable],
  )

  /**
   * A missing key is sent as a request without the header rather than being
   * short-circuited here, so authorisation is always the server's answer and
   * this function never touches state before its first await. Writing state
   * synchronously from the mount effect would cascade an extra render.
   */
  const authorise = useCallback(
    async (key: string | null) => {
      try {
        const response = await fetchOrNull(
          '/api/scan/session',
          { headers: key ? { authorization: `Bearer ${key}` } : undefined, cache: 'no-store' },
          SESSION_TIMEOUT_MS,
        )

        // No answer, or a server that cannot reach its own database, leaves the
        // officer working from the list saved on this device.
        if (!response || response.status >= 500) {
          enterOffline(key)
          return
        }

        markReachable(true)

        if (response.status === 401) {
          clearStoredKey()
          setGate('locked')
          // Only a key that was actually offered deserves a complaint; a first
          // visit should just see the form.
          setKeyError(key ? 'Kode petugas tidak dikenali.' : null)
          return
        }

        if (!response.ok) {
          setGate('locked')
          setKeyError('Belum ada acara yang aktif. Hubungi koordinator.')
          return
        }

        const body = await response.json().catch(() => null)

        if (!body) {
          enterOffline(key)
          return
        }

        if (key) {
          storeKey(key)
          void refreshManifest(key)
        }

        setSession(body as Session)
        setGate('ready')
      } catch {
        setGate('locked')
        setKeyError(UNREACHABLE)
      } finally {
        setSubmitting(false)
      }
    },
    [enterOffline, markReachable, refreshManifest],
  )

  const submitKey = useCallback(
    (key: string) => {
      setSubmitting(true)
      setKeyError(null)
      void authorise(key)
    },
    [authorise],
  )

  useEffect(() => {
    const consumeFragment = () => {
      const key = readKeyFromFragment()

      if (key) {
        storeKey(key)
        stripFragment()
      }

      return key
    }

    // Pasting the keyed link into a tab that already has this page open only
    // changes the fragment, which does not reload the document. Officers do
    // exactly that when they open the scanner first and find the link later.
    const onHashChange = () => {
      const key = consumeFragment()

      if (key) {
        void authorise(key)
      }
    }

    window.addEventListener('hashchange', onHashChange)

    // The rule fires for any effect that reaches a setState, including this one,
    // where every write happens after the request resolves. Verifying the stored
    // key on mount has nowhere else to live: the key is held in localStorage,
    // which the server cannot read, and the camera has to stay hidden until the
    // server has accepted it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void authorise(consumeFragment() ?? loadStoredKey())

    return () => window.removeEventListener('hashchange', onHashChange)
  }, [authorise])

  useEffect(() => {
    if (gate !== 'ready') {
      return
    }

    // Keeps the copy on the device close to what other gates have recorded, so
    // it is as fresh as it can be at the moment the signal drops.
    const interval = window.setInterval(() => {
      const key = loadStoredKey()

      if (!key) {
        return
      }

      void refreshManifest(key).then((outcome) => {
        if (outcome === 'unauthorised') {
          lockOutExpired()
        } else if (outcome !== 'failed') {
          markReachable(outcome === 'ok')
        }
      })
    }, MANIFEST_REFRESH_MS)

    return () => window.clearInterval(interval)
  }, [gate, lockOutExpired, markReachable, refreshManifest])

  useEffect(
    () => () => {
      for (const timer of [dismissTimerRef.current, toastTimerRef.current]) {
        if (timer !== null) {
          window.clearTimeout(timer)
        }
      }
    },
    [],
  )

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }

    busyRef.current = false
    activeTokenRef.current = null
    setOverlay(null)
  }, [])

  const scheduleDismiss = useCallback(
    (delay: number) => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current)
      }

      dismissTimerRef.current = window.setTimeout(dismiss, delay)
    },
    [dismiss],
  )

  const lookUp = useCallback(
    async (raw: string) => {
      const key = loadStoredKey()

      if (!key) {
        lockOut(EXPIRED_KEY)
        return
      }

      activeTokenRef.current = raw
      setOverlay({ kind: 'lookup' })

      const cached = manifest ? null : loadCachedManifest()
      const list = manifest ?? cached?.manifest ?? null
      const since = manifestCachedAt ?? cached?.cachedAt ?? null

      const waiting = previewFromQueue(loadQueue(), list, raw, PENDING_LABEL)

      if (waiting) {
        setOverlay({ kind: 'preview', preview: waiting })
        return
      }

      const answerOffline = () => {
        if (!list || !since) {
          setOverlay({ kind: 'failure', message: NO_OFFLINE_DATA })
          return
        }

        setOverlay({ kind: 'preview', preview: previewFromManifest(list, raw), offlineSince: since })
      }

      if (!navigator.onLine) {
        markReachable(false)
        answerOffline()
        return
      }

      const response = await fetchOrNull(
        '/api/checkin/preview',
        withKey(key, { method: 'POST', body: JSON.stringify({ token: raw }) }),
        PREVIEW_TIMEOUT_MS,
      )

      if (!response || response.status >= 500) {
        markReachable(false)
        answerOffline()
        return
      }

      markReachable(true)

      if (response.status === 401) {
        lockOut(EXPIRED_KEY)
        return
      }

      const body = response.ok ? await response.json().catch(() => null) : null

      if (!body) {
        setOverlay({ kind: 'failure', message: 'Gagal memeriksa tiket. Coba scan ulang.' })
        return
      }

      setOverlay({ kind: 'preview', preview: body as Preview })
    },
    [lockOut, manifest, manifestCachedAt, markReachable],
  )

  const handleDecode = useCallback(
    (decoded: string) => {
      if (busyRef.current) {
        return
      }

      busyRef.current = true

      if ('vibrate' in navigator) {
        navigator.vibrate(SCAN_VIBRATION_MS)
      }

      void lookUp(decoded)
    },
    [lookUp],
  )

  const handleSelect = useCallback(
    (token: string) => {
      if (busyRef.current) {
        return
      }

      busyRef.current = true
      void lookUp(token)
    },
    [lookUp],
  )

  const admitOffline = useCallback(
    (raw: string, preview: Preview) => {
      const token = extractToken(raw)
      const person = preview.registration

      if (!token || !person) {
        setOverlay({ kind: 'failure', message: 'Tiket ini tidak bisa dicatat. Coba scan ulang.' })
        return
      }

      const clientScannedAt = new Date().toISOString()

      if (!enqueueCheckIn({ token, clientScannedAt, staffLabel: loadStaffLabel() ?? undefined })) {
        setOverlay({ kind: 'failure', message: STORAGE_REFUSED })
        return
      }

      const stats: Stats = session
        ? { checkedIn: session.stats.checkedIn + 1, total: session.stats.total }
        : { checkedIn: 1, total: 1 }

      setManifest((current) => (current ? markCheckedIn(current, token, clientScannedAt) : current))
      setSession((current) => (current ? { ...current, stats } : current))
      setOverlay({
        kind: 'done',
        fullName: person.fullName,
        community: person.community,
        checkedInAt: clientScannedAt,
        stats,
        queued: true,
      })
      scheduleDismiss(QUEUED_DISMISS_MS)
    },
    [enqueueCheckIn, scheduleDismiss, session],
  )

  const confirm = useCallback(async () => {
    const token = activeTokenRef.current

    if (overlay?.kind !== 'preview' || !token) {
      return
    }

    const { preview, offlineSince } = overlay

    if (offlineSince) {
      admitOffline(token, preview)
      return
    }

    const key = loadStoredKey()

    if (!key) {
      lockOut(EXPIRED_KEY)
      return
    }

    setOverlay({ kind: 'committing', preview })

    const response = await fetchOrNull(
      '/api/checkin',
      withKey(key, {
        method: 'POST',
        body: JSON.stringify({
          token,
          staffLabel: loadStaffLabel() ?? undefined,
          clientScannedAt: new Date().toISOString(),
        }),
      }),
      CHECKIN_TIMEOUT_MS,
    )

    // The request may still have landed. Queuing it is safe either way: a ticket
    // the server already recorded comes back from the sync as already recorded.
    if (!response || response.status >= 500) {
      markReachable(false)
      admitOffline(token, preview)
      return
    }

    markReachable(true)

    if (response.status === 401) {
      lockOut(EXPIRED_KEY)
      return
    }

    const body = await response.json().catch(() => null)

    if (response.ok && body) {
      const stats = body.stats as Stats
      const recorded = extractToken(token)

      setSession((current) => (current ? { ...current, stats } : current))
      setManifest((current) =>
        current && recorded ? markCheckedIn(current, recorded, body.registration.checkedInAt) : current,
      )
      setOverlay({
        kind: 'done',
        fullName: body.registration.fullName,
        community: body.registration.community ?? null,
        checkedInAt: body.registration.checkedInAt,
        stats,
      })
      scheduleDismiss(DONE_DISMISS_MS)
      return
    }

    const code = body?.error?.code

    // Another gate took this ticket, or the organisers cancelled it, while the
    // overlay was open. Showing that outcome beats a generic failure message.
    if (code === 'ALREADY_CHECKED_IN' || code === 'REGISTRATION_CANCELLED') {
      setOverlay({
        kind: 'preview',
        preview: {
          status: code === 'ALREADY_CHECKED_IN' ? 'already_used' : 'cancelled',
          canCheckIn: false,
          registration: body.error.details ?? null,
        },
      })
      return
    }

    setOverlay({
      kind: 'failure',
      message: body?.error?.message ?? 'Gagal mencatat. Coba lagi.',
    })
  }, [admitOffline, lockOut, markReachable, overlay, scheduleDismiss])

  const openSearch = useCallback(async () => {
    const key = loadStoredKey()

    if (!key) {
      lockOut(EXPIRED_KEY)
      return
    }

    setView('search')
    setManifestError(null)

    let hasList = manifest !== null

    if (!hasList) {
      const cached = loadCachedManifest()

      if (cached) {
        setManifest(overlayPending(cached.manifest, loadQueue()))
        setManifestCachedAt(cached.cachedAt)
        hasList = true
      }
    }

    // Fetched afresh every time the tab opens, because other gates keep checking
    // people in while this one is scanning.
    setManifestLoading(true)
    const outcome = await refreshManifest(key)
    setManifestLoading(false)

    if (outcome === 'ok') {
      markReachable(true)
      return
    }

    if (outcome === 'unauthorised') {
      lockOut(EXPIRED_KEY)
      return
    }

    if (outcome === 'unreachable') {
      markReachable(false)
    }

    if (!hasList) {
      setManifestError(
        outcome === 'unreachable' ? NO_OFFLINE_DATA : 'Gagal memuat daftar peserta. Coba lagi.',
      )
    }
  }, [lockOut, manifest, markReachable, refreshManifest])

  const logout = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }

    clearStoredKey()
    clearOfflineData()
    storeStaffLabel('')
    reloadPending()

    busyRef.current = false
    activeTokenRef.current = null
    setOverlay(null)
    setSyncReport(null)
    setManifest(null)
    setManifestCachedAt(null)
    setSession(null)
    setView('scan')
    setKeyError(null)
    setGate('locked')
  }, [reloadPending])

  const requestLogout = useCallback(() => {
    setOverlay({ kind: 'logout', pending })
  }, [pending])

  const sendBeforeLogout = useCallback(() => {
    dismiss()
    void syncNow()
  }, [dismiss, syncNow])

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }

    setSyncReport(null)
  }, [])

  if (gate === 'checking') {
    return <p className="p-6 text-center text-ink-muted">Memeriksa akses…</p>
  }

  if (gate === 'locked') {
    return (
      <div className="p-6">
        <KeyGate pending={submitting} error={keyError} onSubmit={submitKey} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-2 rounded-card bg-surface px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-semibold text-ink">{session?.event.name}</span>
          <button
            type="button"
            onClick={requestLogout}
            className="min-h-tap shrink-0 rounded-pill border border-line-input px-3 text-sm text-ink"
          >
            Keluar
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <ConnectionStatus
            reachable={reachable}
            pending={pending}
            syncing={syncing}
            onSyncNow={() => void syncNow()}
          />
          <span className="shrink-0 text-sm text-ink-muted">
            {session?.stats.checkedIn} / {session?.stats.total} hadir
          </span>
        </div>
      </header>

      {/* Kept mounted while searching so the camera keeps its stream; starting it
          again would cost the officer another tap on the button. */}
      <div className={view === 'scan' ? 'flex flex-col gap-4' : 'hidden'}>
        <StaffLabel />
        <CameraView paused={overlay !== null || view !== 'scan'} onDecode={handleDecode} />
        <button
          type="button"
          onClick={() => void openSearch()}
          className="min-h-tap rounded-pill border border-line-input px-6 text-ink"
        >
          Cari Manual
        </button>
      </div>

      {view === 'search' && (
        <ManualSearch
          manifest={manifest}
          loading={manifestLoading}
          error={manifestError}
          offlineSince={reachable ? null : manifestCachedAt}
          onRetry={() => void openSearch()}
          onSelect={handleSelect}
          onBack={() => setView('scan')}
        />
      )}

      {syncReport && <SyncToast report={syncReport} onDismiss={dismissToast} />}

      {overlay && (
        <ResultOverlay
          state={overlay.kind === 'logout' ? { kind: 'logout', pending } : overlay}
          onConfirm={() => void confirm()}
          onDismiss={dismiss}
          onLogout={logout}
          onSyncNow={sendBeforeLogout}
        />
      )}
    </div>
  )
}
