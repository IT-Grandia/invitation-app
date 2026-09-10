'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  clearStoredKey,
  loadStoredKey,
  readKeyFromFragment,
  storeKey,
  stripFragment,
} from '@/lib/scanner-session'

import { CameraView } from './CameraView'
import { KeyGate } from './KeyGate'

type Session = {
  event: { name: string }
  stats: { checkedIn: number; total: number }
}

type PreviewStatus = 'ready' | 'already_used' | 'not_found' | 'cancelled' | 'wrong_event'

type Preview = {
  status: PreviewStatus
  canCheckIn: boolean
  registration: {
    ticketNumber: string
    fullName: string
    checkedInAt: string | null
    checkedInBy: string | null
  } | null
}

type Gate = 'checking' | 'locked' | 'ready'

const HEADLINE: Record<PreviewStatus, string> = {
  ready: 'Tiket sah',
  already_used: 'Sudah check-in',
  cancelled: 'Pendaftaran dibatalkan',
  not_found: 'QR tidak dikenali',
  wrong_event: 'Tiket untuk acara lain',
}

const TONE: Record<PreviewStatus, string> = {
  ready: 'border-success/50',
  already_used: 'border-warning/50',
  cancelled: 'border-danger/50',
  not_found: 'border-danger/50',
  wrong_event: 'border-danger/50',
}

export function Scanner() {
  const [gate, setGate] = useState<Gate>('checking')
  const [session, setSession] = useState<Session | null>(null)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

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
      setKeyError('Tidak bisa menghubungi server. Periksa koneksi, lalu coba lagi.')
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

  const lookUp = useCallback(async (decoded: string) => {
    const key = loadStoredKey()

    if (!key) {
      setGate('locked')
      return
    }

    setScanError(null)

    try {
      const response = await fetch('/api/checkin/preview', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ token: decoded }),
        cache: 'no-store',
      })

      if (response.status === 401) {
        clearStoredKey()
        setGate('locked')
        setKeyError('Kode petugas sudah tidak berlaku. Minta kode baru ke koordinator.')
        return
      }

      if (!response.ok) {
        setScanError('Gagal memeriksa tiket. Coba scan ulang.')
        return
      }

      setPreview((await response.json()) as Preview)
    } catch {
      setScanError('Tidak bisa menghubungi server. Periksa koneksi, lalu scan ulang.')
    }
  }, [])

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

  const halted = preview !== null || scanError !== null

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between rounded-card bg-surface px-4 py-3">
        <span className="font-semibold text-ink">{session?.event.name}</span>
        <span className="text-ink-muted">
          {session?.stats.checkedIn} / {session?.stats.total} hadir
        </span>
      </header>

      <CameraView paused={halted} onDecode={lookUp} />

      {scanError && (
        <div className="rounded-card border border-danger/50 bg-surface p-4">
          <p className="text-ink">{scanError}</p>
        </div>
      )}

      {preview && (
        <div className={`rounded-card border bg-surface p-4 ${TONE[preview.status]}`}>
          <p className="font-display text-xl text-ink">{HEADLINE[preview.status]}</p>

          {preview.registration && (
            <>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {preview.registration.fullName}
              </p>
              <p className="text-ink-muted">{preview.registration.ticketNumber}</p>
            </>
          )}

          {preview.status === 'already_used' && preview.registration?.checkedInBy && (
            <p className="mt-2 text-ink-muted">oleh {preview.registration.checkedInBy}</p>
          )}
        </div>
      )}

      {halted && (
        <button
          type="button"
          onClick={() => {
            setPreview(null)
            setScanError(null)
          }}
          className="min-h-tap rounded-pill border border-line-input px-6 text-ink"
        >
          Scan Lagi
        </button>
      )}
    </div>
  )
}
