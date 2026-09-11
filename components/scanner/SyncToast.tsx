'use client'

import type { SyncReport } from './useCheckInQueue'

type Props = {
  report: SyncReport
  onDismiss: () => void
}

export function SyncToast({ report, onDismiss }: Props) {
  const refused = report.refused > 0

  const parts = [
    report.synced > 0 ? `${report.synced} tersinkron` : null,
    report.alreadyRecorded > 0 ? `${report.alreadyRecorded} sudah tercatat sebelumnya` : null,
    refused ? `${report.refused} ditolak server` : null,
    report.failed > 0 ? `${report.failed} gagal, dicoba lagi` : null,
  ].filter((part): part is string => part !== null)

  return (
    <div
      role={refused ? 'alert' : 'status'}
      className={`fixed inset-x-4 bottom-4 z-40 flex items-start justify-between gap-3 rounded-card border-2 bg-surface p-4 text-ink ${refused ? 'border-danger' : 'border-success'}`}
    >
      <div className="min-w-0">
        <p className="font-semibold">Sinkronisasi check-in offline</p>
        <p className="text-sm">{parts.join(' · ')}</p>
        {refused && (
          <p className="mt-2 text-sm">
            Peserta yang ditolak sudah terlanjur masuk saat offline. Laporkan ke koordinator.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="min-h-tap shrink-0 rounded-pill px-3 text-sm text-ink-muted"
      >
        Tutup
      </button>
    </div>
  )
}
