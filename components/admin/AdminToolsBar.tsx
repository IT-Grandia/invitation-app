'use client'

import { useState } from 'react'

import { fetchOrNull } from '@/lib/network'

import { withAdminKey } from './admin-session'
import type { AdminEventSummary } from './types'

type Props = {
  event: AdminEventSummary
  adminKey: string
  pendingSyncCount: number
  onStatusChanged: () => void
  onSyncComplete: () => void
}

export function AdminToolsBar({
  event,
  adminKey,
  pendingSyncCount,
  onStatusChanged,
  onSyncComplete,
}: Props) {
  const [toggleModalOpen, setToggleModalOpen] = useState(false)
  const [togglePending, setTogglePending] = useState(false)
  const [syncPending, setSyncPending] = useState(false)
  const [exportPending, setExportPending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isClosed = event.status === 'closed'

  const handleToggleRegistration = async () => {
    setTogglePending(true)
    setMessage(null)

    try {
      const response = await fetchOrNull(
        '/api/admin/toggle-registration',
        withAdminKey(adminKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ closed: !isClosed }),
        }),
        8000,
      )

      if (!response || !response.ok) {
        setMessage({ type: 'error', text: 'Gagal memperbarui status pendaftaran acara.' })
        return
      }

      setMessage({
        type: 'success',
        text: isClosed
          ? 'Pendaftaran acara berhasil dibuka kembali.'
          : 'Pendaftaran acara telah berhasil ditutup.',
      })
      setToggleModalOpen(false)
      onStatusChanged()
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat memproses status acara.' })
    } finally {
      setTogglePending(false)
    }
  }

  const handleSyncSheets = async () => {
    setSyncPending(true)
    setMessage(null)

    try {
      const response = await fetchOrNull(
        '/api/admin/sync-sheet',
        withAdminKey(adminKey, { method: 'POST' }),
        15000,
      )

      if (!response || !response.ok) {
        setMessage({ type: 'error', text: 'Gagal menyinkronkan data ke Google Sheets.' })
        return
      }

      const json = await response.json()
      if (json.synced > 0) {
        setMessage({
          type: 'success',
          text: `✓ Berhasil menyinkronkan ${json.synced} data ke Google Sheets (${(json.durationMs / 1000).toFixed(1)}s).`,
        })
      } else if (json.failed > 0) {
        setMessage({
          type: 'error',
          text: `Gagal menyinkronkan ${json.failed} baris ke Google Sheets. Periksa izin service account.`,
        })
      } else {
        setMessage({
          type: 'success',
          text: '✓ Seluruh data peserta sudah tersinkron ke Google Sheets.',
        })
      }

      onSyncComplete()
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat sinkronisasi Google Sheets.' })
    } finally {
      setSyncPending(false)
    }
  }

  const handleExportCsv = async () => {
    setExportPending(true)
    setMessage(null)

    try {
      const response = await fetch(
        '/api/admin/export',
        withAdminKey(adminKey, { method: 'GET' }),
      )

      if (!response.ok) {
        setMessage({ type: 'error', text: 'Gagal mengekspor data CSV.' })
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `peserta-${event.name.toLowerCase().replace(/\s+/g, '-')}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: '✓ File CSV berhasil diunduh.' })
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengunduh CSV.' })
    } finally {
      setExportPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toast / Notification Banner */}
      {message && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-card p-3 text-xs font-medium ${
            message.type === 'success'
              ? 'border border-primary/30 bg-primary/10 text-primary'
              : 'border border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-2 font-bold hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Buttons toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Toggle Registration Button */}
          <button
            type="button"
            onClick={() => setToggleModalOpen(true)}
            className={`flex min-h-tap items-center justify-center rounded-card px-3 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
              isClosed
                ? 'border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20'
            }`}
          >
            {isClosed ? 'Buka Pendaftaran' : 'Tutup Pendaftaran'}
          </button>

          {/* Sync Sheets Button */}
          <button
            type="button"
            disabled={syncPending}
            onClick={() => void handleSyncSheets()}
            className="flex min-h-tap items-center justify-center rounded-card border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            {syncPending
              ? 'Menyinkronkan…'
              : pendingSyncCount > 0
                ? `Sync Sheets (${pendingSyncCount})`
                : 'Sync Sheets'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV Button */}
          <button
            type="button"
            disabled={exportPending}
            onClick={() => void handleExportCsv()}
            className="flex min-h-tap items-center justify-center rounded-card border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            {exportPending ? 'Mengunduh…' : '📥 Ekspor CSV'}
          </button>

          {/* Google Sheets External Link if configured */}
          <a
            href={
              process.env.NEXT_PUBLIC_SHEET_URL ||
              'https://docs.google.com/spreadsheets'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-tap items-center justify-center rounded-card border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-canvas sm:px-4 sm:text-sm"
            title="Buka Google Sheets di tab baru"
          >
            Buka Sheet ↗
          </a>
        </div>
      </div>

      {/* Confirmation Dialog for Tutup / Buka Pendaftaran */}
      {toggleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toggle-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-xl">
            <h3 id="toggle-modal-title" className="font-display text-base font-bold text-ink">
              {isClosed ? 'Buka Kembali Pendaftaran?' : 'Tutup Pendaftaran Acara?'}
            </h3>
            <p className="mt-2 text-xs text-ink-muted">
              {isClosed
                ? 'Peserta baru akan dapat kembali mengisi form pendaftaran dan menerima tiket.'
                : 'Form pendaftaran akan ditutup dan menolak pendaftar baru dengan status Pendaftaran Ditutup.'}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={togglePending}
                onClick={() => setToggleModalOpen(false)}
                className="min-h-tap rounded-card border border-line bg-surface px-4 text-xs font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={togglePending}
                onClick={() => void handleToggleRegistration()}
                className={`min-h-tap rounded-card px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
                  isClosed ? 'bg-primary' : 'bg-danger'
                }`}
              >
                {togglePending
                  ? 'Memproses…'
                  : isClosed
                    ? 'Ya, Buka Pendaftaran'
                    : 'Ya, Tutup Pendaftaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
