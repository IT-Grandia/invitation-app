'use client'

import { useCallback, useEffect, useState } from 'react'

import { formatWib } from '@/lib/datetime'
import { fetchOrNull } from '@/lib/network'

import {
  clearAdminKey,
  loadAdminKey,
  readAdminKeyFromFragment,
  storeAdminKey,
  stripAdminFragment,
  withAdminKey,
} from './admin-session'
import { AdminKeyGate } from './AdminKeyGate'
import { AdminRegistrationsTable } from './AdminRegistrationsTable'
import { AdminStatsCards } from './AdminStatsCards'
import { AdminToolsBar } from './AdminToolsBar'
import type { AdminStatsResponse } from './types'

type GateState = 'checking' | 'locked' | 'ready'

const STATS_TIMEOUT_MS = 8000

export function AdminDashboard() {
  const [gateState, setGateState] = useState<GateState>('checking')
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [stats, setStats] = useState<AdminStatsResponse | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verifyAndLoad = useCallback(async (key: string | null) => {
    if (!key) {
      setGateState('locked')
      return
    }

    setPending(true)
    setError(null)

    try {
      const response = await fetchOrNull('/api/admin/stats', withAdminKey(key), STATS_TIMEOUT_MS)

      if (!response) {
        setError('Tidak dapat menghubungi server. Periksa koneksi internet.')
        setGateState('locked')
        return
      }

      if (response.status === 401) {
        clearAdminKey()
        setAdminKey(null)
        setError('Kode admin tidak valid.')
        setGateState('locked')
        return
      }

      if (response.status === 404) {
        setError('Belum ada acara yang aktif.')
        setGateState('locked')
        return
      }

      if (!response.ok) {
        setError(`Terjadi kesalahan server (${response.status}). Coba lagi.`)
        setGateState('locked')
        return
      }

      const data: AdminStatsResponse = await response.json()
      storeAdminKey(key)
      setAdminKey(key)
      setStats(data)
      setGateState('ready')
    } catch {
      setError('Gagal memverifikasi kode admin.')
      setGateState('locked')
    } finally {
      setPending(false)
    }
  }, [])

  useEffect(() => {
    const consumeFragment = () => {
      const key = readAdminKeyFromFragment()
      if (key) {
        storeAdminKey(key)
        stripAdminFragment()
      }
      return key
    }

    const onHashChange = () => {
      const key = consumeFragment()
      if (key) {
        void verifyAndLoad(key)
      }
    }

    window.addEventListener('hashchange', onHashChange)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void verifyAndLoad(consumeFragment() ?? loadAdminKey())

    return () => window.removeEventListener('hashchange', onHashChange)
  }, [verifyAndLoad])

  const handleLogout = useCallback(() => {
    clearAdminKey()
    setAdminKey(null)
    setStats(null)
    setError(null)
    setGateState('locked')
  }, [])

  if (gateState === 'checking') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#EFE9D9] p-4 font-['Space_Grotesk',sans-serif] text-[#0F0F0F]">
        <div
          aria-label="Memeriksa akses"
          className="h-8 w-8 animate-spin rounded-[4px] border-2 border-[#1F8A4C] border-t-transparent"
        />
        <p className="text-xs font-bold uppercase tracking-wider text-[#0F0F0F]/70">
          Memeriksa akses admin…
        </p>
      </div>
    )
  }

  if (gateState === 'locked') {
    return (
      <AdminKeyGate
        pending={pending}
        error={error}
        onSubmit={(key) => {
          void verifyAndLoad(key)
        }}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-[#EFE9D9] text-[#0F0F0F] font-['Space_Grotesk',sans-serif]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-[#0F0F0F] bg-[#FAF8F2]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="font-['Archivo_Black',sans-serif] text-lg tracking-tight text-[#0F0F0F] sm:text-xl">
                  {stats?.event.name ?? 'PANEL ADMIN'}
                </h1>
                <span
                  className={`inline-flex items-center rounded-[4px] border border-[#0F0F0F] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    stats?.event.status === 'published'
                      ? 'bg-[#1F8A4C] text-white'
                      : 'bg-[#E85A1F] text-white'
                  }`}
                >
                  {stats?.event.status === 'published' ? 'Aktif' : stats?.event.status}
                </span>
              </div>
              {stats?.event.startsAt && (
                <p className="mt-0.5 font-mono text-xs text-[#0F0F0F]/70">
                  Waktu Acara: {formatWib(stats.event.startsAt)} WIB
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (adminKey) {
                  void verifyAndLoad(adminKey)
                }
              }}
              disabled={pending}
              className="flex min-h-tap items-center justify-center rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] px-3 text-xs font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] disabled:opacity-50 sm:px-4 sm:text-sm"
              title="Perbarui data"
            >
              {pending ? 'Memuat…' : 'Segarkan'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-tap items-center justify-center rounded-[4px] border border-[#0F0F0F] bg-[#A3271F] px-3 text-xs font-bold text-white transition-all hover:bg-[#851E17] active:translate-y-[1px] sm:px-4 sm:text-sm"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Task A14: Toolbar Aksi Panitia */}
        {stats && adminKey && (
          <AdminToolsBar
            event={stats.event}
            adminKey={adminKey}
            pendingSyncCount={stats.sheetSync.pending}
            sheetUrl={stats.sheetSync.sheetUrl}
            onStatusChanged={() => {
              void verifyAndLoad(adminKey)
            }}
            onSyncComplete={() => {
              void verifyAndLoad(adminKey)
            }}
          />
        )}

        {/* Task A11: Kartu Statistik & Kehadiran */}
        {stats && <AdminStatsCards stats={stats} />}

        {/* Task A12 & A13: Tabel Pendaftar & Aksi Baris */}
        {adminKey && (
          <AdminRegistrationsTable
            adminKey={adminKey}
            onDataChanged={() => {
              void verifyAndLoad(adminKey)
            }}
          />
        )}
      </main>
    </div>
  )
}
