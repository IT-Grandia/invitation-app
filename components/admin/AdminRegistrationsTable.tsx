'use client'

import { useCallback, useEffect, useState } from 'react'

import { formatWibTime } from '@/lib/datetime'
import { fetchOrNull } from '@/lib/network'
import { formatPhoneForDisplay } from '@/lib/phone'

import { withAdminKey } from './admin-session'
import type { AdminRegistrationsResponse } from './types'

type Props = {
  adminKey: string
}

const TABLE_TIMEOUT_MS = 10000

export function AdminRegistrationsTable({ adminKey }: Props) {
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

  const totalPages = Math.ceil((data?.total ?? 0) / limit) || 1
  const startRow = (data?.total ?? 0) === 0 ? 0 : (page - 1) * limit + 1
  const endRow = Math.min(page * limit, data?.total ?? 0)

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-ink">Daftar Pendaftar</h2>
          <p className="text-xs text-ink-muted">
            Kelola peserta terdaftar, verifikasi tiket, dan status kehadiran
          </p>
        </div>
        <div className="text-xs font-medium text-ink-muted">
          Total: <strong className="font-numeric text-ink">{data?.total ?? 0}</strong> pendaftar
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-4 flex flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-muted">
              🔍
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama, nomor HP, atau nomor tiket..."
              className="min-h-tap w-full rounded-card border border-line-input bg-canvas/40 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="flex min-h-tap items-center justify-center rounded-card bg-primary px-4 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90 sm:text-sm"
          >
            Cari
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span>Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="min-h-tap rounded-card border border-line bg-canvas/50 px-2.5 py-1 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Semua Status</option>
              <option value="confirmed">Terdaftar</option>
              <option value="waitlist">Waiting List</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </label>

          {/* Checked-in Filter */}
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span>Kehadiran:</span>
            <select
              value={checkedIn}
              onChange={(e) => {
                setCheckedIn(e.target.value)
                setPage(1)
              }}
              className="min-h-tap rounded-card border border-line bg-canvas/50 px-2.5 py-1 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Semua</option>
              <option value="true">Sudah Hadir</option>
              <option value="false">Belum Hadir</option>
            </select>
          </label>

          {/* Sort Filter */}
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span>Urutkan:</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
              className="min-h-tap rounded-card border border-line bg-canvas/50 px-2.5 py-1 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="created_desc">Pendaftaran (Terbaru)</option>
              <option value="created_asc">Pendaftaran (Terlama)</option>
              <option value="name_asc">Nama (A–Z)</option>
              <option value="name_desc">Nama (Z–A)</option>
              <option value="checkin_desc">Check-in (Terbaru)</option>
            </select>
          </label>

          {(q || status !== 'all' || checkedIn !== 'all' || sort !== 'created_desc') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto text-xs font-medium text-primary hover:underline"
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
          className="mt-4 flex items-center justify-between rounded-card border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="font-semibold underline hover:opacity-80"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="mt-4 overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
          <thead className="border-b border-line bg-surface-2/40 text-xs font-semibold text-ink-muted">
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
          <tbody className="divide-y divide-line/60 bg-surface">
            {loading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 rounded bg-line/60" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-32 rounded bg-line/60" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-24 rounded bg-line/60" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 rounded bg-line/60" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-20 rounded bg-line/60" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="ml-auto h-5 w-6 rounded bg-line/60" />
                  </td>
                </tr>
              ))
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                  <p className="font-semibold text-ink">Tidak ada pendaftar ditemukan</p>
                  <p className="mt-1 text-xs">
                    {q || status !== 'all' || checkedIn !== 'all'
                      ? 'Coba sesuaikan filter atau kata kunci pencarian kamu.'
                      : 'Belum ada peserta yang mendaftar ke acara ini.'}
                  </p>
                  {(q || status !== 'all' || checkedIn !== 'all') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex min-h-tap items-center rounded-pill bg-primary/10 px-4 text-xs font-semibold text-primary hover:bg-primary/20"
                    >
                      Reset Filter
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-canvas/30">
                  <td className="px-4 py-3 font-numeric font-semibold text-ink">
                    <span className="rounded border border-line bg-canvas/60 px-2 py-0.5 text-xs">
                      {item.ticketNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{item.fullName}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://wa.me/${item.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-numeric text-primary hover:underline"
                      title="Kirim pesan WhatsApp"
                    >
                      {formatPhoneForDisplay(item.phone)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'confirmed' && (
                      <span className="inline-flex items-center rounded-pill bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Terdaftar
                      </span>
                    )}
                    {item.status === 'waitlist' && (
                      <span className="inline-flex items-center rounded-pill bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                        Waiting list
                      </span>
                    )}
                    {item.status === 'cancelled' && (
                      <span className="inline-flex items-center rounded-pill bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                        Dibatalkan
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.checkedInAt ? (
                      <span className="inline-flex items-center gap-1 text-ink">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {formatWibTime(item.checkedInAt)} WIB
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      title="Menu aksi pendaftar"
                      className="inline-flex min-h-tap min-w-[36px] items-center justify-center rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                    >
                      <span className="text-lg leading-none">⋮</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-xs text-ink-muted sm:flex-row">
        <div>
          Menampilkan <strong className="font-numeric text-ink">{startRow}</strong>–
          <strong className="font-numeric text-ink">{endRow}</strong> dari{' '}
          <strong className="font-numeric text-ink">{data?.total ?? 0}</strong> peserta
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
            className="flex min-h-tap items-center justify-center rounded-card border border-line bg-surface px-3 py-1 font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
          >
            ◄ Sebelumnya
          </button>
          <span className="px-2 font-medium">
            Halaman <strong className="font-numeric text-ink">{page}</strong> dari{' '}
            <strong className="font-numeric text-ink">{totalPages}</strong>
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
            className="flex min-h-tap items-center justify-center rounded-card border border-line bg-surface px-3 py-1 font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
          >
            Berikutnya ►
          </button>
        </div>
      </div>
    </div>
  )
}
