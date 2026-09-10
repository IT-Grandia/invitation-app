'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'

const READER_ID = 'qr-reader'

// Mirrors Html5QrcodeScannerState, which is only reachable once the library has
// been dynamically imported and so cannot be referenced at module scope.
const SCANNING = 2
const PAUSED = 3

type Props = {
  paused: boolean
  onDecode: (text: string) => void
}

type Phase = 'idle' | 'starting' | 'running' | 'error'

function describeError(error: unknown): string {
  const name = error instanceof Error ? error.name : ''

  if (name === 'NotAllowedError') {
    return 'Akses kamera ditolak. Buka setelan situs di browser, izinkan Kamera, lalu muat ulang halaman.'
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Kamera tidak ditemukan di perangkat ini. Pakai tab Cari Manual.'
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Kamera hanya bisa dipakai lewat HTTPS. Buka halaman ini dengan alamat https.'
  }

  return 'Kamera gagal dinyalakan. Coba muat ulang halaman, atau pakai tab Cari Manual.'
}

export function CameraView({ paused, onDecode }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  // Kept in a ref so restarting the camera is never a side effect of the parent
  // re-rendering with a fresh callback identity. Only the running scanner reads
  // it, and that cannot happen before the effect below has run.
  const onDecodeRef = useRef(onDecode)

  useEffect(() => {
    onDecodeRef.current = onDecode
  }, [onDecode])

  const start = useCallback(async () => {
    setPhase('starting')
    setMessage(null)

    try {
      // Loaded here rather than at module scope: the library reaches for
      // navigator during evaluation, which has no meaning while rendering on
      // the server.
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(READER_ID)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const edge = Math.floor(Math.min(width, height) * 0.7)
            return { width: edge, height: edge }
          },
        },
        (decoded) => onDecodeRef.current(decoded),
        () => {
          // Fires for every frame without a readable code, which is most of
          // them. Nothing to report.
        },
      )

      setPhase('running')
    } catch (error) {
      setPhase('error')
      setMessage(describeError(error))
    }
  }, [])

  useEffect(() => {
    const scanner = scannerRef.current

    if (!scanner || phase !== 'running') {
      return
    }

    // Freezing the frame while a result is on screen keeps the same code from
    // being read again the moment the officer looks away.
    if (paused) {
      if (scanner.getState() === SCANNING) {
        scanner.pause(true)
      }
      return
    }

    if (scanner.getState() === PAUSED) {
      scanner.resume()
    }
  }, [paused, phase])

  useEffect(
    () => () => {
      const scanner = scannerRef.current
      scannerRef.current = null

      if (!scanner) {
        return
      }

      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {
          // Already stopped, or the page is going away. Either way the camera
          // track is released with the document.
        })
    },
    [],
  )

  return (
    <div className="flex flex-col gap-4">
      <div
        id={READER_ID}
        className="overflow-hidden rounded-card border border-line bg-surface-2 [&_video]:w-full"
      />

      {phase === 'idle' && (
        <button
          type="button"
          onClick={start}
          className="min-h-tap rounded-pill bg-primary px-6 font-semibold text-on-primary"
        >
          Nyalakan Kamera
        </button>
      )}

      {phase === 'starting' && (
        <p className="text-center text-ink-muted">Menyiapkan kamera…</p>
      )}

      {phase === 'running' && !paused && (
        <p className="text-center text-ink-muted">Arahkan ke QR peserta</p>
      )}

      {phase === 'error' && (
        <div className="rounded-card border border-danger/40 bg-surface p-4">
          <p className="text-ink">{message}</p>
          <button
            type="button"
            onClick={start}
            className="mt-3 min-h-tap rounded-pill border border-line-input px-5 text-ink"
          >
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  )
}
