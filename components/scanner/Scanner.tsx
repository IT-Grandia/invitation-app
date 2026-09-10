'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  clearStoredKey,
  loadStaffLabel,
  loadStoredKey,
  readKeyFromFragment,
  storeKey,
  stripFragment,
} from '@/lib/scanner-session'
import type { Manifest } from '@/lib/scanner-search'
import { extractToken } from '@/lib/token'

import { CameraView } from './CameraView'
import { KeyGate } from './KeyGate'
import { ManualSearch } from './ManualSearch'
import { ResultOverlay } from './ResultOverlay'
import type { OverlayState } from './ResultOverlay'
import { StaffLabel } from './StaffLabel'
import type { Preview, Session, Stats } from './types'

type Gate = 'checking' | 'locked' | 'ready'
type View = 'scan' | 'search'

const DONE_DISMISS_MS = 1500
const SCAN_VIBRATION_MS = 60

const EXPIRED_KEY = 'Kode petugas sudah tidak berlaku. Minta kode baru ke koordinator.'
const UNREACHABLE = 'Tidak bisa menghubungi server. Periksa koneksi, lalu coba lagi.'

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
  const [pending, setPending] = useState(false)

  const [view, setView] = useState<View>('scan')
  const [overlay, setOverlay] = useState<OverlayState | null>(null)

  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [manifestLoading, setManifestLoading] = useState(false)
  const [manifestError, setManifestError] = useState<string | null>(null)

  // The ticket on screen is only read when the officer confirms, never rendered.
  const activeTokenRef = useRef<string | null>(null)

  // html5-qrcode reports the same code on consecutive frames, faster than React
  // can re-render and pause the camera, so repeat reads are refused here instead.
  const busyRef = useRef(false)

  const dismissTimerRef = useRef<number | null>(null)

  const lockOut = useCallback((message: string) => {
    clearStoredKey()
    busyRef.current = false
    activeTokenRef.current = null
    setOverlay(null)
    setGate('locked')
    setKeyError(message)
  }, [])

  /**
   * A missing key is sent as a request without the header rather than being
   * short-circuited here, so authorisation is always the server's answer and
   * this function never touches state before its first await. Writing state
   * synchronously from the mount effect would cascade an extra render.
   */
  const authorise = useCallback(async (key: string | null) => {
    try {
      const response = await fetch('/api/scan/session', {
        headers: key ? { authorization: `Bearer ${key}` } : undefined,
        cache: 'no-store',
      })

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

      if (key) {
        storeKey(key)
      }

      setSession((await response.json()) as Session)
      setGate('ready')
    } catch {
      setGate('locked')
      setKeyError(UNREACHABLE)
    } finally {
      setPending(false)
    }
  }, [])

  const submitKey = useCallback(
    (key: string) => {
      setPending(true)
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

  useEffect(
    () => () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current)
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

  const lookUp = useCallback(
    async (raw: string) => {
      const key = loadStoredKey()

      if (!key) {
        lockOut(EXPIRED_KEY)
        return
      }

      activeTokenRef.current = raw
      setOverlay({ kind: 'lookup' })

      try {
        const response = await fetch(
          '/api/checkin/preview',
          withKey(key, { method: 'POST', body: JSON.stringify({ token: raw }) }),
        )

        if (response.status === 401) {
          lockOut(EXPIRED_KEY)
          return
        }

        if (!response.ok) {
          setOverlay({ kind: 'failure', message: 'Gagal memeriksa tiket. Coba scan ulang.' })
          return
        }

        setOverlay({ kind: 'preview', preview: (await response.json()) as Preview })
      } catch {
        setOverlay({ kind: 'failure', message: UNREACHABLE })
      }
    },
    [lockOut],
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

  const confirm = useCallback(async () => {
    const token = activeTokenRef.current

    if (overlay?.kind !== 'preview' || !token) {
      return
    }

    const key = loadStoredKey()

    if (!key) {
      lockOut(EXPIRED_KEY)
      return
    }

    const { preview } = overlay
    setOverlay({ kind: 'committing', preview })

    try {
      const response = await fetch(
        '/api/checkin',
        withKey(key, {
          method: 'POST',
          body: JSON.stringify({
            token,
            staffLabel: loadStaffLabel() ?? undefined,
            clientScannedAt: new Date().toISOString(),
          }),
        }),
      )

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
          current && recorded
            ? {
                ...current,
                entries: current.entries.map((entry) =>
                  entry.t === recorded ? { ...entry, c: body.registration.checkedInAt } : entry,
                ),
              }
            : current,
        )
        setOverlay({ kind: 'done', fullName: body.registration.fullName, stats })
        dismissTimerRef.current = window.setTimeout(dismiss, DONE_DISMISS_MS)
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
    } catch {
      // The request may still have reached the server. Scanning again is safe:
      // a ticket that was recorded comes back as already used.
      setOverlay({
        kind: 'failure',
        message: 'Koneksi terputus saat mencatat. Scan ulang tiket ini untuk memastikan sudah tercatat.',
      })
    }
  }, [overlay, lockOut, dismiss])

  // Fetched afresh every time the tab opens, because other gates keep checking
  // people in while this one is scanning.
  const openSearch = useCallback(async () => {
    const key = loadStoredKey()

    if (!key) {
      lockOut(EXPIRED_KEY)
      return
    }

    setView('search')
    setManifestLoading(true)
    setManifestError(null)

    try {
      const response = await fetch('/api/scan/manifest', withKey(key))

      if (response.status === 401) {
        lockOut(EXPIRED_KEY)
        return
      }

      if (!response.ok) {
        setManifestError('Gagal memuat daftar peserta. Coba lagi.')
        return
      }

      setManifest((await response.json()) as Manifest)
    } catch {
      setManifestError(UNREACHABLE)
    } finally {
      setManifestLoading(false)
    }
  }, [lockOut])

  if (gate === 'checking') {
    return <p className="p-6 text-center text-ink-muted">Memeriksa akses…</p>
  }

  if (gate === 'locked') {
    return (
      <div className="p-6">
        <KeyGate pending={pending} error={keyError} onSubmit={submitKey} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-3 rounded-card bg-surface px-4 py-3">
        <span className="truncate font-semibold text-ink">{session?.event.name}</span>
        <span className="shrink-0 text-ink-muted">
          {session?.stats.checkedIn} / {session?.stats.total} hadir
        </span>
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
          onRetry={() => void openSearch()}
          onSelect={handleSelect}
          onBack={() => setView('scan')}
        />
      )}

      {overlay && (
        <ResultOverlay state={overlay} onConfirm={() => void confirm()} onDismiss={dismiss} />
      )}
    </div>
  )
}
