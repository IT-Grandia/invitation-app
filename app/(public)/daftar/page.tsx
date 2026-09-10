import type { Metadata } from 'next'
import Link from 'next/link'

import { RegistrationForm } from '@/components/registration/RegistrationForm'
import { getPublishedEvent } from '@/lib/db/queries/event'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Daftar',
  description: 'Pendaftaran peserta Padel Day 2026. Isi data, tiket langsung jadi.',
}

export default async function DaftarPage() {
  let eventName = 'Padel Day 2026'
  let contactWhatsapp: string | null = null

  try {
    const event = await getPublishedEvent()
    if (event) {
      eventName = event.name
      contactWhatsapp = event.contactWhatsapp
    }
  } catch {
    // Graceful fallback to default values if database is unreachable
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-6 py-12 text-ink selection:bg-primary/20 selection:text-ink">
      {/* Subtle court layout frame line */}
      <div
        className="pointer-events-none absolute inset-y-0 mx-auto w-full max-w-xl border-x border-line/30"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-md">
        {/* Navigation & Header */}
        <div className="mb-6 flex flex-col gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 self-start text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {/* Semantic SVG arrow */}
            <svg
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Kembali</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Pendaftaran Peserta
              </span>
            </div>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Daftar {eventName}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Isi data di bawah, tiket kamu langsung jadi.
            </p>
          </div>
        </div>

        {/* Card containing Registration Form */}
        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          <RegistrationForm contactWhatsapp={contactWhatsapp} />
        </div>

        {/* Reassurance footer text */}
        <p className="mt-6 text-center text-xs text-ink-muted">
          Data hanya digunakan untuk keperluan verifikasi tiket dan komunikasi acara.
        </p>
      </div>
    </main>
  )
}
