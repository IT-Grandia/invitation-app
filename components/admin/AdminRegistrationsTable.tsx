'use client'

import { useCallback, useEffect, useState } from 'react'

import { formatWibTime } from '@/lib/datetime'
import { fetchOrNull } from '@/lib/network'
import { formatPhoneForDisplay } from '@/lib/phone'

import { AdminRowActions } from './AdminRowActions'
import { withAdminKey } from './admin-session'
import type { AdminRegistrationItem, AdminRegistrationsResponse } from './types'

type Props = {
  adminKey: string
  onDataChanged?: () => void
}

const TABLE_TIMEOUT_MS = 10000

export function AdminRegistrationsTable({ adminKey, onDataChanged }: Props) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [checkedIn, setCheckedIn] = useState<string>('all')
  const [sort, setSort] = useState<string>('created_desc')
  const [page, setPage] = useState(1)
  const limit = 50

  const [data, setData] = useState<AdminRegistrationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (status !== 'all') params.set('status', status)
    if (checkedIn !== 'all') params.set('checkedIn', checkedIn)
    if (sort) params.set('sort', sort)
    params.set('page', String(page))
    params.set('limit', String(limit))

    try {
      const response = await fetchOrNull(
        `/api/admin/registrations?${params.toString()}`,
        withAdminKey(adminKey),
        TABLE_TIMEOUT_MS,
      )

      if (!response) {
        setError('Gagal menghubungi server. Periksa koneksi internet.')
        return
      }

      if (!response.ok) {
        setError(`Gagal memuat data peserta (${response.status}).`)
        return
      }

      const json: AdminRegistrationsResponse = await response.json()
      setData(json)
    } catch {
      setError('Terjadi kesalahan saat memuat pendaftar.')
    } finally {
      setLoading(false)
    }
  }, [adminKey, q, status, checkedIn, sort, page, limit])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [loadData])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    void loadData()
  }

  const handleResetFilters = () => {
    setQ('')
    setStatus('all')
    setCheckedIn('all')
    setSort('created_desc')
    setPage(1)
  }

  const handleRowUpdated = (updatedItem: AdminRegistrationItem) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === updatedItem.id ? updatedItem : it)),
      }
    })
    onDataChanged?.()
  }

  const totalPages = Math.ceil((data?.total ?? 0) / limit) || 1
  const startRow = (data?.total ?? 0) === 0 ? 0 : (page - 1) * limit + 1
  const endRow = Math.min(page * limit, data?.total ?? 0)

  return (
    <div className="rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,15,15,0.05)] font-['Space_Grotesk',sans-serif]">
      {/* Header section with responsive layout */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <h2 className="font-['Archivo_Black',sans-serif] text-base sm:text-lg tracking-tight text-[#0F0F0F]">
              Daftar Pendaftar
            </h2>
            <span className="sm:hidden inline-flex items-center rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-2 py-0.5 text-xs font-mono font-bold text-[#0F0F0F]">
              {data?.total ?? 0}
            </span>
          </div>
          <p className="text-xs text-[#0F0F0F]/70">
            Kelola peserta terdaftar, verifikasi tiket, dan status kehadiran
          </p>
        </div>
        <div className="hidden sm:block text-xs font-medium text-[#0F0F0F]/70">
          Total: <strong className="font-mono font-bold text-[#0F0F0F]">{data?.total ?? 0}</strong> pendaftar
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-4 flex flex-col gap-3">
        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#0F0F0F]/50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama, nomor HP, tiket..."
              className="min-h-tap w-full rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] pl-9 pr-3 text-xs font-medium text-[#0F0F0F] placeholder:text-[#0F0F0F]/40 focus:outline-none focus:ring-2 focus:ring-[#1F8A4C] focus:ring-offset-2 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="flex min-h-tap items-center justify-center rounded-[4px] border border-[#0F0F0F] bg-[#1F8A4C] px-3.5 sm:px-4 text-xs font-bold text-white transition-all hover:bg-[#186B3F] active:translate-y-[1px] sm:text-sm shrink-0"
          >
            Cari
          </button>
        </form>

        {/* Filters grid on mobile, inline on desktop */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-filter-status" className="text-[10px] font-bold uppercase tracking-wider text-[#0F0F0F]/70 sm:text-xs">
              Status
            </label>
            <select
              id="admin-filter-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="min-h-tap w-full sm:w-auto rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-2.5 py-1 text-xs font-bold text-[#0F0F0F] focus:outline-none focus:ring-1 focus:ring-[#1F8A4C]"
            >
              <option value="all">Semua Status</option>
              <option value="confirmed">Terdaftar</option>
              <option value="waitlist">Waiting List</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          {/* Checked-in Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-filter-checkin" className="text-[10px] font-bold uppercase tracking-wider text-[#0F0F0F]/70 sm:text-xs">
              Kehadiran
            </label>
            <select
              id="admin-filter-checkin"
              value={checkedIn}
              onChange={(e) => {
                setCheckedIn(e.target.value)
                setPage(1)
              }}
              className="min-h-tap w-full sm:w-auto rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-2.5 py-1 text-xs font-bold text-[#0F0F0F] focus:outline-none focus:ring-1 focus:ring-[#1F8A4C]"
            >
              <option value="all">Semua</option>
              <option value="true">Sudah Hadir</option>
              <option value="false">Belum Hadir</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
            <label htmlFor="admin-filter-sort" className="text-[10px] font-bold uppercase tracking-wider text-[#0F0F0F]/70 sm:text-xs">
              Urutkan
            </label>
            <select
              id="admin-filter-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
              className="min-h-tap w-full sm:w-auto rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-2.5 py-1 text-xs font-bold text-[#0F0F0F] focus:outline-none focus:ring-1 focus:ring-[#1F8A4C]"
            >
              <option value="created_desc">Pendaftaran (Terbaru)</option>
              <option value="created_asc">Pendaftaran (Terlama)</option>
              <option value="name_asc">Nama (A–Z)</option>
              <option value="name_desc">Nama (Z–A)</option>
              <option value="checkin_desc">Check-in (Terbaru)</option>
            </select>
          </div>

          {(q || status !== 'all' || checkedIn !== 'all' || sort !== 'created_desc') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="col-span-2 sm:col-span-1 sm:ml-auto flex min-h-tap items-center justify-center rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-3 py-1 text-xs font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px]"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between rounded-[4px] border border-[#A3271F] bg-[#A3271F]/10 p-3 text-xs font-bold text-[#A3271F]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="font-bold underline hover:opacity-80"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* MOBILE VIEW: Participant Cards Stack (< md) */}
      <div className="mt-4 space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`m-skeleton-${idx}`}
              className="animate-pulse rounded-[4px] border border-[#0F0F0F]/15 bg-[#FAF8F2] p-4 space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-[#0F0F0F]/10 rounded-[2px]" />
                <div className="h-5 w-16 bg-[#0F0F0F]/10 rounded-[2px]" />
              </div>
              <div className="h-5 w-3/4 bg-[#0F0F0F]/10 rounded-[2px]" />
              <div className="h-4 w-1/2 bg-[#0F0F0F]/10 rounded-[2px]" />
            </div>
          ))
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] p-6 text-center text-[#0F0F0F]/70">
            <p className="font-['Archivo_Black',sans-serif] text-sm text-[#0F0F0F]">
              Tidak ada pendaftar ditemukan
            </p>
            <p className="mt-1 text-xs">
              {q || status !== 'all' || checkedIn !== 'all'
                ? 'Coba sesuaikan filter atau kata kunci pencarian kamu.'
                : 'Belum ada peserta yang mendaftar ke acara ini.'}
            </p>
            {(q || status !== 'all' || checkedIn !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex min-h-tap items-center rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] px-4 text-xs font-bold text-[#0F0F0F] hover:bg-[#EFE9D9]"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          data.items.map((item) => (
            <div
              key={`m-${item.id}`}
              className="rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] p-3.5 shadow-sm transition-all hover:bg-[#FAF8F2]"
            >
              {/* Header row: Ticket + Status + Row Menu */}
              <div className="flex items-center justify-between gap-2 border-b border-[#0F0F0F]/10 pb-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] text-[#0F0F0F]">
                    {item.ticketNumber}
                  </span>
                  {item.status === 'confirmed' && (
                    <span className="inline-flex items-center rounded-[4px] border border-[#1F8A4C] bg-[#1F8A4C]/10 px-2 py-0.5 text-[11px] font-bold text-[#1F8A4C]">
                      Terdaftar
                    </span>
                  )}
                  {item.status === 'waitlist' && (
                    <span className="inline-flex items-center rounded-[4px] border border-[#E85A1F] bg-[#E85A1F]/10 px-2 py-0.5 text-[11px] font-bold text-[#E85A1F]">
                      Waiting list
                    </span>
                  )}
                  {item.status === 'cancelled' && (
                    <span className="inline-flex items-center rounded-[4px] border border-[#A3271F] bg-[#A3271F]/10 px-2 py-0.5 text-[11px] font-bold text-[#A3271F]">
                      Dibatalkan
                    </span>
                  )}
                </div>
                <AdminRowActions
                  item={item}
                  adminKey={adminKey}
                  onActionSuccess={handleRowUpdated}
                />
              </div>

              {/* Middle row: Full Name & WhatsApp */}
              <div className="pt-2.5">
                <h3 className="font-['Space_Grotesk',sans-serif] text-sm font-bold text-[#0F0F0F]">
                  {item.fullName}
                </h3>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-[#0F0F0F]/50">WA:</span>
                  <a
                    href={`https://wa.me/${item.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#1F8A4C] hover:underline"
                    title="Kirim pesan WhatsApp"
                  >
                    {formatPhoneForDisplay(item.phone)}
                  </a>
                </div>
              </div>

              {/* Bottom row: Check-in status */}
              <div className="mt-2.5 flex items-center justify-between border-t border-[#0F0F0F]/10 pt-2 text-[11px] font-mono text-[#0F0F0F]/70">
                <span>Check-in:</span>
                {item.checkedInAt ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#1F8A4C]">
                    <span className="h-2 w-2 rounded-[2px] bg-[#1F8A4C]" aria-hidden="true" />
                    <span>{formatWibTime(item.checkedInAt)} WIB</span>
                  </span>
                ) : (
                  <span className="text-[#0F0F0F]/40 font-medium">Belum Hadir</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP VIEW: Full Data Table (>= md) */}
      <div className="mt-4 hidden md:block overflow-x-auto rounded-[4px] border border-[#0F0F0F]">
        <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
          <thead className="border-b border-[#0F0F0F] bg-[#FAF8F2] text-[11px] font-bold uppercase tracking-wider text-[#0F0F0F]/80">
            <tr>
              <th scope="col" className="px-4 py-3">
                Tiket
              </th>
              <th scope="col" className="px-4 py-3">
                Nama
              </th>
              <th scope="col" className="px-4 py-3">
                WhatsApp
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Check-in
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0F0F0F]/15 bg-[#FFFFFF]">
            {loading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 rounded-[2px] bg-[#0F0F0F]/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-32 rounded-[2px] bg-[#0F0F0F]/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-24 rounded-[2px] bg-[#0F0F0F]/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 rounded-[2px] bg-[#0F0F0F]/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-20 rounded-[2px] bg-[#0F0F0F]/10" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="ml-auto h-5 w-6 rounded-[2px] bg-[#0F0F0F]/10" />
                  </td>
                </tr>
              ))
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[#0F0F0F]/70">
                  <p className="font-['Archivo_Black',sans-serif] text-sm text-[#0F0F0F]">
                    Tidak ada pendaftar ditemukan
                  </p>
                  <p className="mt-1 text-xs">
                    {q || status !== 'all' || checkedIn !== 'all'
                      ? 'Coba sesuaikan filter atau kata kunci pencarian kamu.'
                      : 'Belum ada peserta yang mendaftar ke acara ini.'}
                  </p>
                  {(q || status !== 'all' || checkedIn !== 'all') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex min-h-tap items-center rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-4 text-xs font-bold text-[#0F0F0F] hover:bg-[#EFE9D9]"
                    >
                      Reset Filter
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-[#FAF8F2]">
                  <td className="px-4 py-3 font-mono font-semibold text-[#0F0F0F]">
                    <span className="rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-2 py-0.5 text-xs">
                      {item.ticketNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#0F0F0F]">{item.fullName}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://wa.me/${item.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#1F8A4C] hover:underline"
                      title="Kirim pesan WhatsApp"
                    >
                      {formatPhoneForDisplay(item.phone)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'confirmed' && (
                      <span className="inline-flex items-center rounded-[4px] border border-[#1F8A4C] bg-[#1F8A4C]/10 px-2 py-0.5 text-xs font-bold text-[#1F8A4C]">
                        Terdaftar
                      </span>
                    )}
                    {item.status === 'waitlist' && (
                      <span className="inline-flex items-center rounded-[4px] border border-[#E85A1F] bg-[#E85A1F]/10 px-2 py-0.5 text-xs font-bold text-[#E85A1F]">
                        Waiting list
                      </span>
                    )}
                    {item.status === 'cancelled' && (
                      <span className="inline-flex items-center rounded-[4px] border border-[#A3271F] bg-[#A3271F]/10 px-2 py-0.5 text-xs font-bold text-[#A3271F]">
                        Dibatalkan
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.checkedInAt ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#0F0F0F]">
                        <span className="h-2 w-2 rounded-[2px] bg-[#1F8A4C]" aria-hidden="true" />
                        <span>{formatWibTime(item.checkedInAt)} WIB</span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-[#0F0F0F]/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminRowActions
                      item={item}
                      adminKey={adminKey}
                      onActionSuccess={handleRowUpdated}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-col gap-2.5 border-t border-[#0F0F0F]/15 pt-3.5 text-xs font-mono text-[#0F0F0F]/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          Menampilkan <strong className="font-bold text-[#0F0F0F]">{startRow}</strong>–
          <strong className="font-bold text-[#0F0F0F]">{endRow}</strong> dari{' '}
          <strong className="font-bold text-[#0F0F0F]">{data?.total ?? 0}</strong> peserta
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
            className="flex flex-1 sm:flex-none min-h-tap items-center justify-center rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-3 py-1 font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] disabled:opacity-50 font-['Space_Grotesk',sans-serif]"
          >
            ◄ Sebelumnya
          </button>
          <span className="px-2 font-bold text-center shrink-0">
            <span className="hidden sm:inline">Halaman </span>
            <strong className="text-[#0F0F0F]">{page}</strong>
            <span className="text-[#0F0F0F]/50"> / </span>
            <strong className="text-[#0F0F0F]">{totalPages}</strong>
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
            className="flex flex-1 sm:flex-none min-h-tap items-center justify-center rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-3 py-1 font-bold text-[#0F0F0F] transition-all hover:bg-[#EFE9D9] active:translate-y-[1px] disabled:opacity-50 font-['Space_Grotesk',sans-serif]"
          >
            Berikutnya ►
          </button>
        </div>
      </div>
    </div>
  )
}
