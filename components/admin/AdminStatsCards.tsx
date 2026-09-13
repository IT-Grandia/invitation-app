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
    <div className="space-y-4 font-['Space_Grotesk',sans-serif]">
      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Terdaftar */}
        <div className="rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] p-4 shadow-[0_2px_12px_rgba(15,15,15,0.05)] transition-transform hover:-translate-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F0F]/70">
            Terdaftar
          </span>
          <p className="mt-1 font-['Archivo_Black',sans-serif] text-3xl tracking-tight text-[#0F0F0F] sm:text-4xl">
            {totals.registered}
          </p>
          <p className="mt-1 text-xs text-[#0F0F0F]/60">
            {totals.waitlist > 0 ? `${totals.waitlist} menunggu antrean` : 'Peserta terkonfirmasi'}
          </p>
        </div>

        {/* Sudah Hadir - Primary Accent Card */}
        <div className="relative overflow-hidden rounded-[4px] border-2 border-[#1F8A4C] bg-[#F4F9F5] p-4 shadow-[0_2px_12px_rgba(31,138,76,0.12)] transition-transform hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#1F8A4C]" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F8A4C]">
            Sudah Hadir
          </span>
          <p className="mt-1 font-['Archivo_Black',sans-serif] text-3xl tracking-tight text-[#1F8A4C] sm:text-4xl">
            {totals.checkedIn}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#1F8A4C]/80">
            {attendancePercentage}% dari total peserta
          </p>
        </div>

        {/* Belum Hadir */}
        <div className="rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] p-4 shadow-[0_2px_12px_rgba(15,15,15,0.05)] transition-transform hover:-translate-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F0F]/70">
            Belum Hadir
          </span>
          <p className="mt-1 font-['Archivo_Black',sans-serif] text-3xl tracking-tight text-[#0F0F0F] sm:text-4xl">
            {totals.notCheckedIn}
          </p>
          <p className="mt-1 text-xs text-[#0F0F0F]/60">
            {notCheckedInPercentage}% belum datang
          </p>
        </div>

        {/* Sisa Kuota */}
        <div className="rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] p-4 shadow-[0_2px_12px_rgba(15,15,15,0.05)] transition-transform hover:-translate-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#E85A1F]">
            Sisa Kuota
          </span>
          <p className="mt-1 font-['Archivo_Black',sans-serif] text-3xl tracking-tight text-[#0F0F0F] sm:text-4xl">
            {totals.remaining !== null ? totals.remaining : 'Tak terbatas'}
          </p>
          <p className="mt-1 text-xs text-[#0F0F0F]/60">
            {event.capacity !== null ? `Kapasitas maksimal ${event.capacity}` : 'Tanpa batas kuota'}
          </p>
        </div>
      </div>

      {/* Kehadiran & Check-in Terakhir */}
      <section
        aria-labelledby="attendance-section-title"
        className="rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] p-5 shadow-[0_2px_12px_rgba(15,15,15,0.05)]"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="attendance-section-title" className="font-['Archivo_Black',sans-serif] text-base tracking-tight text-[#0F0F0F]">
              Tingkat Kehadiran
            </h2>
            <p className="text-xs text-[#0F0F0F]/70">
              Persentase pendaftar yang sudah memindai tiket di venue
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sheetSync.pending > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#E85A1F] bg-[#E85A1F]/10 px-2.5 py-1 text-xs font-bold text-[#E85A1F]">
                ⚠ {sheetSync.pending} belum sync Sheets
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#1F8A4C] bg-[#1F8A4C]/10 px-2.5 py-1 text-xs font-bold text-[#1F8A4C]">
                ✓ Sheets tersinkron
              </span>
            )}

            {totals.cancelled > 0 && (
              <span className="inline-flex items-center rounded-[4px] border border-[#A3271F] bg-[#A3271F]/10 px-2.5 py-1 text-xs font-bold text-[#A3271F]">
                {totals.cancelled} dibatalkan
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#0F0F0F]">
            <span>Kehadiran</span>
            <span className="font-mono">
              {totals.checkedIn} dari {totals.registered} ({attendancePercentage}%)
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={totals.checkedIn}
            aria-valuemin={0}
            aria-valuemax={totals.registered}
            aria-valuetext={`${totals.checkedIn} dari ${totals.registered} peserta hadir (${attendancePercentage}%)`}
            className="h-3.5 w-full overflow-hidden rounded-[4px] border border-[#0F0F0F] bg-[#E4DCC4]/50"
          >
            <div
              className="h-full bg-[#1F8A4C] transition-all duration-500 ease-out"
              style={{ width: `${attendancePercentage}%` }}
            />
          </div>
        </div>

        {/* Footer info: Last check-in & Last sheet sync */}
        <div className="mt-4 flex flex-col justify-between gap-2 border-t border-[#0F0F0F]/15 pt-3 text-xs text-[#0F0F0F]/70 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-[2px] border border-[#0F0F0F] ${
                totals.checkedIn > 0 ? 'bg-[#1F8A4C]' : 'bg-[#E4DCC4]'
              }`}
              aria-hidden="true"
            />
            {lastCheckIn ? (
              <span>
                Check-in terakhir:{' '}
                <strong className="font-mono font-bold text-[#0F0F0F]">
                  {formatWibTime(lastCheckIn.checkedInAt)} WIB
                </strong>
                {lastCheckIn.checkedInBy && (
                  <span className="text-[#0F0F0F]/70"> · {lastCheckIn.checkedInBy}</span>
                )}
              </span>
            ) : (
              <span>Belum ada peserta yang check-in</span>
            )}
          </div>

          {sheetSync.lastSyncedAt && (
            <span className="font-mono text-xs text-[#0F0F0F]/70">
              Sync Sheets terakhir: {formatWib(sheetSync.lastSyncedAt)} WIB
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
