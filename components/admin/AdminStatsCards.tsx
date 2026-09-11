'use client'

import { formatWib, formatWibTime } from '@/lib/datetime'

import type { AdminStatsResponse } from './types'

type Props = {
  stats: AdminStatsResponse
}

export function AdminStatsCards({ stats }: Props) {
  const { totals, event, sheetSync, lastCheckIn } = stats

  const attendancePercentage =
    totals.registered > 0 ? Math.round((totals.checkedIn / totals.registered) * 100) : 0

  const notCheckedInPercentage =
    totals.registered > 0 ? Math.round((totals.notCheckedIn / totals.registered) * 100) : 0

  return (
    <div className="space-y-4">
      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Terdaftar */}
        <div className="rounded-card border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="text-xs font-semibold text-ink-muted">Terdaftar</span>
          <p className="mt-1 font-numeric text-3xl font-bold tracking-tight text-ink">
            {totals.registered}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {totals.waitlist > 0 ? `${totals.waitlist} menunggu antrean` : 'Peserta terkonfirmasi'}
          </p>
        </div>

        {/* Sudah Hadir */}
        <div className="rounded-card border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="text-xs font-semibold text-primary">Sudah Hadir</span>
          <p className="mt-1 font-numeric text-3xl font-bold tracking-tight text-primary">
            {totals.checkedIn}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{attendancePercentage}% dari total peserta</p>
        </div>

        {/* Belum Hadir */}
        <div className="rounded-card border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="text-xs font-semibold text-ink-muted">Belum Hadir</span>
          <p className="mt-1 font-numeric text-3xl font-bold tracking-tight text-ink">
            {totals.notCheckedIn}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{notCheckedInPercentage}% belum datang</p>
        </div>

        {/* Sisa Kuota */}
        <div className="rounded-card border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="text-xs font-semibold text-ink-muted">Sisa Kuota</span>
          <p className="mt-1 font-numeric text-3xl font-bold tracking-tight text-ink">
            {totals.remaining !== null ? totals.remaining : 'Tak terbatas'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {event.capacity !== null ? `Kapasitas maksimal ${event.capacity}` : 'Tanpa batas kuota'}
          </p>
        </div>
      </div>

      {/* Kehadiran & Check-in Terakhir */}
      <section
        aria-labelledby="attendance-section-title"
        className="rounded-card border border-line bg-surface p-5 shadow-sm"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="attendance-section-title" className="font-display text-base font-bold text-ink">
              Tingkat Kehadiran
            </h2>
            <p className="text-xs text-ink-muted">
              Persentase pendaftar yang sudah memindai tiket di venue
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sheetSync.pending > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                ⚠ {sheetSync.pending} belum sync Sheets
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                ✓ Sheets tersinkron
              </span>
            )}

            {totals.cancelled > 0 && (
              <span className="inline-flex items-center rounded-pill bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                {totals.cancelled} dibatalkan
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-ink">
            <span>Kehadiran</span>
            <span className="font-numeric">
              {totals.checkedIn} dari {totals.registered} ({attendancePercentage}%)
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={totals.checkedIn}
            aria-valuemin={0}
            aria-valuemax={totals.registered}
            aria-valuetext={`${totals.checkedIn} dari ${totals.registered} peserta hadir (${attendancePercentage}%)`}
            className="h-3 w-full overflow-hidden rounded-pill bg-surface-2/60"
          >
            <div
              className="h-full rounded-pill bg-primary transition-all duration-500 ease-out"
              style={{ width: `${attendancePercentage}%` }}
            />
          </div>
        </div>

        {/* Footer info: Last check-in & Last sheet sync */}
        <div className="mt-4 flex flex-col justify-between gap-2 border-t border-line/60 pt-3 text-xs text-ink-muted sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${totals.checkedIn > 0 ? 'bg-primary' : 'bg-line-input'}`}
              aria-hidden="true"
            />
            {lastCheckIn ? (
              <span>
                Check-in terakhir:{' '}
                <strong className="font-semibold text-ink">
                  {formatWibTime(lastCheckIn.checkedInAt)} WIB
                </strong>
                {lastCheckIn.checkedInBy && (
                  <span className="text-ink-muted"> · {lastCheckIn.checkedInBy}</span>
                )}
              </span>
            ) : (
              <span>Belum ada peserta yang check-in</span>
            )}
          </div>

          {sheetSync.lastSyncedAt && (
            <span className="text-xs text-ink-muted">
              Sync Sheets terakhir: {formatWib(sheetSync.lastSyncedAt)} WIB
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
