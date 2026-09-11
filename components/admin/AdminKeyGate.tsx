'use client'

import { useState } from 'react'

type Props = {
  pending: boolean
  error: string | null
  onSubmit: (key: string) => void
}

export function AdminKeyGate({ pending, error, onSubmit }: Props) {
  const [value, setValue] = useState('')

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form
        className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = value.trim()
          if (trimmed) {
            onSubmit(trimmed)
          }
        }}
      >
        <div className="text-center">
          <span className="inline-block rounded-pill bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Akses Panitia
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
            Panel Admin
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Masukkan kode admin untuk mengelola pendaftaran dan check-in peserta.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <label htmlFor="admin-key" className="text-xs font-semibold text-ink-muted">
            Kode Admin
          </label>
          <input
            id="admin-key"
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ketik kode admin..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'admin-key-error' : undefined}
            className="min-h-tap w-full rounded-card border border-line-input bg-canvas/30 px-4 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <p id="admin-key-error" role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="mt-6 flex min-h-tap w-full items-center justify-center rounded-pill bg-primary px-6 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Memeriksa…' : 'Buka Dashboard'}
        </button>

        <p className="mt-4 text-center text-xs text-ink-muted">
          Perlu akses? Hubungi penanggung jawab teknis acara.
        </p>
      </form>
    </div>
  )
}
