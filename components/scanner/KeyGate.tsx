'use client'

import { useState } from 'react'

type Props = {
  pending: boolean
  error: string | null
  onSubmit: (key: string) => void
}

export function KeyGate({ pending, error, onSubmit }: Props) {
  const [value, setValue] = useState('')

  return (
    <form
      className="mx-auto flex w-full max-w-sm flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = value.trim()
        if (trimmed) {
          onSubmit(trimmed)
        }
      }}
    >
      <div className="text-center">
        <h1 className="font-display text-2xl text-ink">Akses Petugas</h1>
        <p className="mt-2 text-ink-muted">Masukkan kode petugas untuk mulai check-in.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="sr-only">Kode petugas</span>
        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'key-error' : undefined}
          className="min-h-tap rounded-card border border-line-input bg-surface px-4 text-ink"
        />
      </label>

      {error && (
        <p id="key-error" role="alert" className="text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="min-h-tap rounded-pill bg-primary px-6 font-semibold text-on-primary disabled:opacity-50"
      >
        {pending ? 'Memeriksa…' : 'Masuk'}
      </button>

      <p className="text-center text-sm text-ink-muted">
        Belum punya kode? Hubungi koordinator acara.
      </p>
    </form>
  )
}
