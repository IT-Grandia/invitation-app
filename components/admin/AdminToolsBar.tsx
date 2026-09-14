'use client'

import { useState } from 'react'

import { fetchOrNull } from '@/lib/network'

import { withAdminKey } from './admin-session'
import type { AdminEventSummary } from './types'

type Props = {
  event: AdminEventSummary
  adminKey: string
  pendingSyncCount: number
  sheetUrl?: string | null
  onStatusChanged: () => void
  onSyncComplete: () => void
}

export function AdminToolsBar({
  event,
  adminKey,
  pendingSyncCount,
  sheetUrl,
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
    <div className="flex flex-col gap-3 font-['Space_Grotesk',sans-serif]">
      {/* Toast / Notification Banner */}
      {message && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-[4px] p-3.5 text-xs font-bold ${
            message.type === 'success'
              ? 'border border-[#1F8A4C] bg-[#1F8A4C]/10 text-[#1F8A4C]'
              : 'border border-[#A3271F] bg-[#A3271F]/10 text-[#A3271F]'
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-3 inline-flex h-6 w-6 items-center justify-center rounded-[2px] border border-current text-xs font-bold hover:opacity-75"
            aria-label="Tutup pesan"
          >
            ✕
          </button>
        </div>
      )}

      {/* Buttons toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] p-3.5 shadow-[0_2px_12px_rgba(15,15,15,0.05)] sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Registration Button */}
          <button
            type="button"
            onClick={() => setToggleModalOpen(true)}
            className={`flex min-h-tap items-center justify-center rounded-[4px] border border-[#0F0F0F] px-4 text-xs font-bold transition-all active:translate-y-[1px] sm:text-sm ${
              isClosed
                ? 'bg-[#1F8A4C] text-white hover:bg-[#186B3F]'
                : 'bg-[#A3271F] text-white hover:bg-[#851E17]'
            }`}
          >
            {isClosed ? 'Buka Pendaftaran' : 'Tutup Pendaftaran'}
          </button>

          {/* Sync Sheets Button */}
          <button
            type="button"
            disabled={syncPending}
            onClick={() => void handleSyncSheets()}
            className="flex min-h-tap items-center justify-center gap-2 rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-4 text-xs font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] disabled:opacity-50 sm:text-sm"
          >
            {syncPending ? (
              'Menyinkronkan…'
            ) : pendingSyncCount > 0 ? (
              <>
                <span>Sync Sheets</span>
                <span className="rounded-[3px] border border-[#0F0F0F] bg-[#F5C518] px-1.5 py-0.2 text-[10px] font-bold text-[#0F0F0F]">
                  {pendingSyncCount}
                </span>
              </>
            ) : (
              'Sync Sheets'
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV Button */}
          <button
            type="button"
            disabled={exportPending}
            onClick={() => void handleExportCsv()}
            className="flex min-h-tap items-center justify-center gap-1.5 rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-4 text-xs font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] disabled:opacity-50 sm:text-sm"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{exportPending ? 'Mengunduh…' : 'Ekspor CSV'}</span>
          </button>

          {/* Google Sheets External Link if configured */}
          <a
            href={
              sheetUrl ||
              process.env.NEXT_PUBLIC_SHEET_URL ||
              'https://docs.google.com/spreadsheets'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-tap items-center justify-center gap-1 rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-4 text-xs font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] sm:text-sm"
            title="Buka Google Sheets di tab baru"
          >
            <span>Buka Sheet</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      {/* Confirmation Dialog for Tutup / Buka Pendaftaran */}
      {toggleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toggle-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F0F]/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-[4px] border-2 border-[#0F0F0F] bg-[#FFFFFF] p-6 shadow-[0_8px_32px_rgba(15,15,15,0.18)]">
            <h3 id="toggle-modal-title" className="font-['Archivo_Black',sans-serif] text-base tracking-tight text-[#0F0F0F]">
              {isClosed ? 'Buka Kembali Pendaftaran?' : 'Tutup Pendaftaran Acara?'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#0F0F0F]/70">
              {isClosed
                ? 'Peserta baru akan dapat kembali mengisi form pendaftaran dan menerima tiket.'
                : 'Form pendaftaran akan ditutup dan menolak pendaftar baru dengan status Pendaftaran Ditutup.'}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={togglePending}
                onClick={() => setToggleModalOpen(false)}
                className="min-h-tap rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-4 text-xs font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={togglePending}
                onClick={() => void handleToggleRegistration()}
                className={`min-h-tap rounded-[4px] border border-[#0F0F0F] px-4 text-xs font-bold text-white transition-all active:translate-y-[1px] disabled:opacity-50 ${
                  isClosed ? 'bg-[#1F8A4C] hover:bg-[#186B3F]' : 'bg-[#A3271F] hover:bg-[#851E17]'
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
