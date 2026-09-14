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
    <div className="relative font-['Space_Grotesk',sans-serif]" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Menu aksi untuk ${item.fullName}`}
        className="inline-flex min-h-tap min-w-[36px] items-center justify-center rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] p-1.5 text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-[#1F8A4C]"
      >
        <span className="text-base font-bold leading-none" aria-hidden="true">
          ⋮
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-52 rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] py-1.5 shadow-[0_4px_20px_rgba(15,15,15,0.12)]"
        >
          {error && (
            <div role="alert" className="border-b border-[#0F0F0F]/15 px-3 py-1.5 text-xs font-bold text-[#A3271F]">
              {error}
            </div>
          )}

          {/* Copy Ticket Number */}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyTicket}
            className="flex w-full items-center px-3 py-2 text-left text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#EFE9D9]"
          >
            {copied ? '✓ Nomor Tiket Disalin' : 'Salin Nomor Tiket'}
          </button>

          {/* Action based on status & check-in */}
          {item.status === 'confirmed' && !item.checkedInAt && (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => void executeAction('manual_checkin')}
              className="flex w-full items-center px-3 py-2 text-left text-xs font-bold text-[#1F8A4C] transition-colors hover:bg-[#1F8A4C]/10 disabled:opacity-50"
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
              className="flex w-full items-center px-3 py-2 text-left text-xs font-bold text-[#E85A1F] transition-colors hover:bg-[#E85A1F]/10 disabled:opacity-50"
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
              className="flex w-full items-center border-t border-[#0F0F0F]/15 px-3 py-2 text-left text-xs font-bold text-[#A3271F] transition-colors hover:bg-[#A3271F]/10 disabled:opacity-50"
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
              className="flex w-full items-center px-3 py-2 text-left text-xs font-bold text-[#1F8A4C] transition-colors hover:bg-[#1F8A4C]/10 disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F0F]/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-[4px] border-2 border-[#0F0F0F] bg-[#FFFFFF] p-6 shadow-[0_8px_32px_rgba(15,15,15,0.18)]">
            <h3 id="cancel-dialog-title" className="font-['Archivo_Black',sans-serif] text-base tracking-tight text-[#0F0F0F]">
              Batalkan Pendaftaran?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#0F0F0F]/70">
              Kamu akan membatalkan pendaftaran atas nama{' '}
              <strong className="text-[#0F0F0F]">{item.fullName}</strong> ({item.ticketNumber}). Tiket
              ini tidak dapat digunakan untuk check-in, dan kuotanya akan dilepas.
            </p>

            {error && (
              <p role="alert" className="mt-3 rounded-[4px] border border-[#A3271F] bg-[#A3271F]/10 p-2 text-xs font-bold text-[#A3271F]">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmCancelOpen(false)}
                className="min-h-tap rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-4 text-xs font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void executeAction('cancel')}
                className="min-h-tap rounded-[4px] border border-[#0F0F0F] bg-[#A3271F] px-4 text-xs font-bold text-white transition-all hover:bg-[#851E17] active:translate-y-[1px] disabled:opacity-50"
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
