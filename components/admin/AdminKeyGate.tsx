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
    <div className="flex min-h-dvh items-center justify-center bg-[#EFE9D9] p-4 text-[#0F0F0F]">
      <form
        className="w-full max-w-md rounded-[4px] border border-[#0F0F0F] bg-[#FFFFFF] p-6 shadow-[0_4px_24px_rgba(15,15,15,0.06)] sm:p-8"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = value.trim()
          if (trimmed) {
            onSubmit(trimmed)
          }
        }}
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#0F0F0F] bg-[#1F8A4C] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518]" aria-hidden="true" />
            <span>Akses Panitia</span>
          </div>
          <h1 className="mt-4 font-['Archivo_Black',sans-serif] text-2xl tracking-tight text-[#0F0F0F] sm:text-3xl">
            PANEL ADMIN
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[#0F0F0F]/70 font-['Space_Grotesk',sans-serif]">
            Masukkan kode admin untuk mengelola pendaftaran, kuota, dan verifikasi check-in peserta.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <label
            htmlFor="admin-key"
            className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F0F]/80 font-['Space_Grotesk',sans-serif]"
          >
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
            className="min-h-tap w-full rounded-[4px] border border-[#0F0F0F] bg-[#FAF8F2] px-4 font-mono text-sm text-[#0F0F0F] placeholder:text-[#0F0F0F]/40 focus:outline-none focus:ring-2 focus:ring-[#1F8A4C] focus:ring-offset-2 focus:ring-offset-[#FAF8F2]"
          />
        </div>

        {error && (
          <p
            id="admin-key-error"
            role="alert"
            className="mt-3 rounded-[4px] border border-[#E85A1F] bg-[#E85A1F]/10 p-3 text-xs font-medium text-[#E85A1F] font-['Space_Grotesk',sans-serif]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="mt-6 flex min-h-tap w-full items-center justify-center rounded-[4px] border border-[#0F0F0F] bg-[#1F8A4C] px-6 text-sm font-bold text-white transition-all hover:bg-[#186B3F] active:translate-y-[1px] disabled:opacity-50 font-['Space_Grotesk',sans-serif]"
        >
          {pending ? 'Memeriksa…' : 'Buka Dashboard'}
        </button>

        <p className="mt-4 text-center text-xs text-[#0F0F0F]/60 font-['Space_Grotesk',sans-serif]">
          Perlu akses? Hubungi penanggung jawab teknis acara.
        </p>
      </form>
    </div>
  )
}
