'use client'

type Props = {
  reachable: boolean
  pending: number
  syncing: boolean
  onSyncNow: () => void
}

function statusOf({ reachable, pending, syncing }: Omit<Props, 'onSyncNow'>) {
  if (syncing) {
    return { dot: 'bg-warning', label: `Mengirim ${pending} check-in…` }
  }

  if (!reachable) {
    return { dot: 'bg-danger', label: pending > 0 ? `Offline · ${pending} menunggu` : 'Offline' }
  }

  if (pending > 0) {
    return { dot: 'bg-warning', label: `Online · ${pending} menunggu` }
  }

  return { dot: 'bg-success', label: 'Online' }
}

export function ConnectionStatus({ reachable, pending, syncing, onSyncNow }: Props) {
  const { dot, label } = statusOf({ reachable, pending, syncing })

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span role="status" className="flex min-w-0 items-center gap-2 text-sm text-ink">
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{label}</span>
      </span>

      {reachable && pending > 0 && !syncing && (
        <button
          type="button"
          onClick={onSyncNow}
          className="min-h-tap shrink-0 rounded-pill border border-line-input px-3 text-sm text-ink"
        >
          Kirim
        </button>
      )}
    </div>
  )
}
