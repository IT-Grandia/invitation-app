'use client'

import { useEffect, useRef, useState } from 'react'

import { fetchOrNull } from '@/lib/network'

import { withAdminKey } from './admin-session'
import type { AdminRegistrationItem } from './types'

type Props = {
  item: AdminRegistrationItem
  adminKey: string
  onActionSuccess: (updatedItem: AdminRegistrationItem) => void
}

const ACTION_TIMEOUT_MS = 8000

export function AdminRowActions({ item, adminKey, onActionSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const executeAction = async (action: 'manual_checkin' | 'undo_checkin' | 'cancel' | 'restore') => {
    setPending(true)
    setError(null)

    try {
      const response = await fetchOrNull(
        `/api/admin/registrations/${item.id}`,
        withAdminKey(adminKey, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }),
        ACTION_TIMEOUT_MS,
      )

      if (!response) {
        setError('Gagal menghubungi server. Periksa koneksi internet.')
        return
      }

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null)
        setError(errorJson?.error?.message ?? `Aksi gagal (${response.status}).`)
        return
      }

      const json = await response.json()
      if (json.item) {
        onActionSuccess(json.item)
      }

      setIsOpen(false)
      setConfirmCancelOpen(false)
    } catch {
      setError('Terjadi kesalahan saat memproses aksi.')
    } finally {
      setPending(false)
    }
  }

  const handleCopyTicket = async () => {
    try {
      await navigator.clipboard.writeText(item.ticketNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard write failures in unsupported contexts
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Menu aksi untuk ${item.fullName}`}
        className="inline-flex min-h-tap min-w-[36px] items-center justify-center rounded-md p-1.5 text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="text-lg leading-none" aria-hidden="true">
          ⋮
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-48 rounded-card border border-line bg-surface py-1.5 shadow-lg backdrop-blur-md"
        >
          {error && (
            <div role="alert" className="border-b border-line px-3 py-1.5 text-xs text-danger">
              {error}
            </div>
          )}

          {/* Copy Ticket Number */}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyTicket}
            className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:bg-canvas"
          >
            {copied ? '✓ Nomor Tiket Disalin' : '📋 Salin Nomor Tiket'}
          </button>

          {/* Action based on status & check-in */}
          {item.status === 'confirmed' && !item.checkedInAt && (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => void executeAction('manual_checkin')}
              className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-primary transition-colors hover:bg-canvas disabled:opacity-50"
            >
              {pending ? 'Memproses…' : '✓ Check-in Manual'}
            </button>
          )}

          {item.status === 'confirmed' && item.checkedInAt && (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => void executeAction('undo_checkin')}
              className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-warning transition-colors hover:bg-canvas disabled:opacity-50"
            >
              {pending ? 'Memproses…' : '↺ Batalkan Check-in'}
            </button>
          )}

          {item.status === 'confirmed' && (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => {
                setIsOpen(false)
                setConfirmCancelOpen(true)
              }}
              className="flex w-full items-center border-t border-line/60 px-3 py-2 text-left text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              ✕ Batalkan Pendaftaran
            </button>
          )}

          {item.status === 'cancelled' && (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => void executeAction('restore')}
              className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-primary transition-colors hover:bg-canvas disabled:opacity-50"
            >
              {pending ? 'Memproses…' : '↻ Pulihkan Pendaftaran'}
            </button>
          )}
        </div>
      )}

      {/* Modal / Dialog Konfirmasi Batalkan Pendaftaran */}
      {confirmCancelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-xl">
            <h3 id="cancel-dialog-title" className="font-display text-base font-bold text-ink">
              Batalkan Pendaftaran?
            </h3>
            <p className="mt-2 text-xs text-ink-muted">
              Kamu akan membatalkan pendaftaran atas nama{' '}
              <strong className="text-ink">{item.fullName}</strong> ({item.ticketNumber}). Tiket
              ini tidak dapat digunakan untuk check-in, dan kuotanya akan dilepas.
            </p>

            {error && (
              <p role="alert" className="mt-3 text-xs font-medium text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmCancelOpen(false)}
                className="min-h-tap rounded-card border border-line bg-surface px-4 text-xs font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void executeAction('cancel')}
                className="min-h-tap rounded-card bg-danger px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pending ? 'Membatalkan…' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
