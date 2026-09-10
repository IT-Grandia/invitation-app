'use client'

import { useMemo, useState } from 'react'

import { formatWibTime } from '@/lib/datetime'
import { MIN_QUERY_LENGTH, searchManifest } from '@/lib/scanner-search'
import type { Manifest } from '@/lib/scanner-search'
import { ticketNumber } from '@/lib/token'

type Props = {
  manifest: Manifest | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onSelect: (token: string) => void
  onBack: () => void
}

export function ManualSearch({ manifest, loading, error, onRetry, onSelect, onBack }: Props) {
  const [query, setQuery] = useState('')

  const results = useMemo(
    () => (manifest ? searchManifest(manifest.entries, query) : []),
    [manifest, query],
  )

  const searching = query.trim().length >= MIN_QUERY_LENGTH

  return (
    <section aria-labelledby="manual-search-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-tap rounded-pill border border-line-input px-4 text-ink"
        >
          ← Kembali
        </button>
        <h2 id="manual-search-title" className="font-display text-xl text-ink">
          Cari Manual
        </h2>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-ink-muted">Nama peserta atau nomor tiket</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="min-h-tap rounded-card border border-line-input bg-surface px-4 text-ink"
        />
      </label>

      {loading && !manifest && <p className="text-ink-muted">Memuat daftar peserta…</p>}

      {error && (
        <div role="alert" className="rounded-card border border-danger/50 bg-surface p-4">
          <p className="text-ink">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-tap rounded-pill border border-line-input px-5 text-ink"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {manifest && !searching && (
        <p className="text-ink-muted">
          Ketik minimal {MIN_QUERY_LENGTH} huruf. {manifest.total} peserta terdaftar.
        </p>
      )}

      {manifest && searching && results.length === 0 && (
        <p className="text-ink-muted">Tidak ada peserta yang cocok.</p>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card bg-surface">
          {results.map((entry) => (
            <li key={entry.t} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{entry.n}</p>
                <p className="font-mono text-sm text-ink-muted">{ticketNumber(entry.t)}</p>
              </div>
              {entry.c ? (
                <span className="shrink-0 text-success">
                  <span aria-hidden="true">✓ </span>
                  <span className="sr-only">Sudah hadir pukul </span>
                  {formatWibTime(entry.c)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(entry.t)}
                  className="min-h-tap shrink-0 rounded-pill bg-primary px-4 font-semibold text-on-primary"
                >
                  Check-in
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
