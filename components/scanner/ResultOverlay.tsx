'use client'

import type { ReactNode } from 'react'

import { BrandHeader } from '@/components/ui/BrandHeader'
import { CheckMark } from '@/components/ui/CheckMark'
import { formatWibTime } from '@/lib/datetime'
import { COMMUNITY_LABELS, parseCommunity } from '@/lib/validation/survey'

import type { Preview, PreviewStatus, Stats } from './types'

export type OverlayState =
  | { kind: 'lookup' }
  | { kind: 'preview'; preview: Preview; offlineSince?: string }
  | { kind: 'committing'; preview: Preview }
  | {
      kind: 'done'
      fullName: string
      community: string | null
      checkedInAt: string
      stats: Stats
      queued?: boolean
    }
  | { kind: 'failure'; message: string }
  | { kind: 'logout'; pending: number }

type Props = {
  state: OverlayState
  onConfirm: () => void
  onDismiss: () => void
  onLogout: () => void
  onSyncNow: () => void
}

type Refusal = Exclude<PreviewStatus, 'ready' | 'already_used'>

// English for the lines the participant reads across the desk, Indonesian for
// the lines meant for the officer holding the phone (DESIGN.md section 5.4).
const REFUSAL_TITLE: Record<Refusal, string> = {
  not_found: 'Not found',
  cancelled: 'Cancelled',
  wrong_event: 'Wrong event',
}

const REFUSAL_ADVICE: Record<Refusal, string> = {
  not_found: 'Minta peserta menunjukkan tiketnya, atau pakai Cari Manual.',
  cancelled: 'Arahkan peserta ke koordinator acara.',
  wrong_event: 'Minta peserta menunjukkan tiket untuk acara ini.',
}

const OFFLINE_NOT_FOUND =
  'Tidak ada di daftar yang tersimpan di HP. Kalau peserta yakin terdaftar, tunggu sinyal lalu scan ulang, atau hubungi koordinator.'

const BUTTON =
  'min-h-tap inline-flex w-full max-w-sm items-center justify-center rounded-pill px-8 font-display text-lg font-semibold tracking-[0.06em] md:min-h-14 md:text-xl'
const PRIMARY = `${BUTTON} bg-primary text-on-primary shadow-card disabled:opacity-60`
const SECONDARY = `${BUTTON} border border-line-input text-ink disabled:opacity-50`

const SCREEN_LABEL =
  'font-display text-sm font-semibold tracking-[0.2em] text-ink-muted uppercase md:text-base'
const HEADLINE = 'font-display text-3xl font-semibold'
const NAME = 'font-display text-xl font-semibold text-balance md:text-2xl'
const TICKET = 'font-mono text-sm tracking-widest tabular-nums'
const TIME = 'font-mono text-sm tabular-nums'

function refusalOf(status: PreviewStatus): Refusal {
  return status === 'ready' || status === 'already_used' ? 'not_found' : status
}

function communityLabel(community: string | null): string | null {
  const code = parseCommunity(community)

  return code ? COMMUNITY_LABELS[code] : null
}

/** The warning and danger counterparts of CheckMark, same size and weight. */
function StatusMark({ tone, glyph }: { tone: 'warning' | 'danger'; glyph: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-32 w-32 items-center justify-center rounded-pill font-display text-6xl font-semibold text-canvas ${
        tone === 'warning' ? 'bg-warning' : 'bg-danger'
      }`}
    >
      {glyph}
    </span>
  )
}

function OfflineNote({ since }: { since: string }) {
  return (
    <p className="rounded-pill border border-line-input px-4 py-1 text-sm text-ink-muted">
      Mode offline · data per {formatWibTime(since)}
    </p>
  )
}

function Shell({
  children,
  onEscape,
  live,
}: {
  children: ReactNode
  onEscape?: () => void
  live?: boolean
}) {
  const role = live
    ? { role: 'status' as const }
    : {
        role: 'alertdialog' as const,
        'aria-modal': true,
        'aria-labelledby': 'overlay-title',
        'aria-describedby': 'overlay-detail',
      }

  return (
    <div
      {...role}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onEscape) {
          onEscape()
        }
      }}
      className="paper-stripes fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-canvas p-6 text-center text-ink"
    >
      <BrandHeader className="w-full max-w-sm" />
      {children}
    </div>
  )
}

/**
 * Colour is never the only signal: every state also carries its own mark and
 * headline, so the result reads the same in harsh sunlight or to an officer who
 * cannot tell the tones apart. Focus lands on the least consequential action,
 * because neither a confirmed check-in nor a logout that discards unsent
 * check-ins can be undone from this page.
 */
export function ResultOverlay({ state, onConfirm, onDismiss, onLogout, onSyncNow }: Props) {
  if (state.kind === 'lookup') {
    return (
      <div
        role="status"
        className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/90 p-6 text-center"
      >
        <p className="text-xl text-ink">Memeriksa tiket…</p>
      </div>
    )
  }

  if (state.kind === 'done') {
    const community = communityLabel(state.community)

    return (
      <Shell live>
        <p className={SCREEN_LABEL}>Check-in</p>
        <CheckMark className="h-32 w-32 text-primary" />
        <div>
          <h2 className={`${HEADLINE} text-primary`}>Checked In</h2>
          <p className="mt-1 font-display text-lg text-ink-muted italic md:text-xl">Welcome!</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className={NAME}>{state.fullName}</p>
          {community && <p className="text-ink-muted">{community}</p>}
          <p className={TIME}>{formatWibTime(state.checkedInAt)} WIB</p>
        </div>
        <p className="text-sm text-ink-muted">
          {state.queued
            ? 'Tersimpan di HP ini, dikirim otomatis saat sinyal kembali.'
            : `Hadir: ${state.stats.checkedIn} / ${state.stats.total}`}
        </p>
        <button type="button" onClick={onDismiss} className={PRIMARY}>
          Lanjut Scan
        </button>
      </Shell>
    )
  }

  if (state.kind === 'failure') {
    return (
      <Shell onEscape={onDismiss}>
        <StatusMark tone="danger" glyph="✕" />
        <h2 id="overlay-title" className={`${HEADLINE} text-danger`}>
          Ada gangguan
        </h2>
        <p id="overlay-detail" className="max-w-sm text-ink-muted text-pretty">
          {state.message}
        </p>
        <button type="button" onClick={onDismiss} autoFocus className={SECONDARY}>
          Kembali
        </button>
      </Shell>
    )
  }

  if (state.kind === 'logout') {
    if (state.pending > 0) {
      return (
        <Shell onEscape={onDismiss}>
          <StatusMark tone="danger" glyph="!" />
          <h2 id="overlay-title" className={`${HEADLINE} text-danger`}>
            {state.pending} check-in belum terkirim
          </h2>
          <p id="overlay-detail" className="max-w-sm text-ink-muted text-pretty">
            Kalau keluar sekarang, data itu ikut terhapus dan peserta tersebut tidak akan pernah
            tercatat.
          </p>
          <div className="flex w-full flex-col items-center gap-3">
            <button type="button" onClick={onSyncNow} autoFocus className={PRIMARY}>
              Kirim Dulu
            </button>
            <button type="button" onClick={onLogout} className={SECONDARY}>
              Tetap Keluar dan Hapus
            </button>
            <button type="button" onClick={onDismiss} className={SECONDARY}>
              Batal
            </button>
          </div>
        </Shell>
      )
    }

    return (
      <Shell onEscape={onDismiss}>
        <h2 id="overlay-title" className={HEADLINE}>
          Keluar dari scanner?
        </h2>
        <p id="overlay-detail" className="max-w-sm text-ink-muted text-pretty">
          Kode petugas dan daftar peserta akan dihapus dari HP ini. Untuk masuk lagi, buka link dari
          koordinator.
        </p>
        <div className="flex w-full flex-col items-center gap-3">
          <button type="button" onClick={onDismiss} autoFocus className={PRIMARY}>
            Batal
          </button>
          <button type="button" onClick={onLogout} className={SECONDARY}>
            Keluar
          </button>
        </div>
      </Shell>
    )
  }

  const { preview } = state
  const committing = state.kind === 'committing'
  const offlineSince = state.kind === 'preview' ? state.offlineSince : undefined
  const person = preview.registration

  if (preview.status === 'ready' && person) {
    return (
      <Shell onEscape={committing ? undefined : onDismiss}>
        {offlineSince && <OfflineNote since={offlineSince} />}
        <div className="flex flex-col gap-0.5">
          <p id="overlay-title" className={NAME}>
            {person.fullName}
          </p>
          {communityLabel(person.community) && (
            <p className="text-ink-muted">{communityLabel(person.community)}</p>
          )}
          <p className={`${TICKET} text-ink-muted`}>{person.ticketNumber}</p>
        </div>
        <p id="overlay-detail" className="max-w-sm text-ink-muted text-pretty">
          {offlineSince ? 'Belum check-in menurut data di HP.' : 'Belum check-in.'} Cocokkan nama
          dengan orang di depanmu.
        </p>
        <div className="flex w-full flex-col items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={committing}
            aria-busy={committing}
            className={PRIMARY}
          >
            {committing ? 'Mencatat…' : 'Konfirmasi Check-in'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={committing}
            autoFocus
            className={SECONDARY}
          >
            Batal
          </button>
        </div>
      </Shell>
    )
  }

  if (preview.status === 'already_used' && person) {
    return (
      <Shell onEscape={onDismiss}>
        {offlineSince && <OfflineNote since={offlineSince} />}
        <StatusMark tone="warning" glyph="!" />
        <h2 id="overlay-title" className={`${HEADLINE} text-warning`}>
          Already used
        </h2>
        <div className="flex flex-col gap-0.5">
          <p className={NAME}>{person.fullName}</p>
          {communityLabel(person.community) && (
            <p className="text-ink-muted">{communityLabel(person.community)}</p>
          )}
          {person.checkedInAt && <p className={TIME}>{formatWibTime(person.checkedInAt)} WIB</p>}
        </div>
        <p id="overlay-detail" className="max-w-sm text-ink-muted text-pretty">
          {person.checkedInBy
            ? `Sudah check-in oleh ${person.checkedInBy}. Panggil koordinator kalau peserta merasa belum masuk.`
            : 'Sudah check-in. Panggil koordinator kalau peserta merasa belum masuk.'}
        </p>
        <button type="button" onClick={onDismiss} autoFocus className={SECONDARY}>
          Kembali
        </button>
      </Shell>
    )
  }

  const refusal = refusalOf(preview.status)

  return (
    <Shell onEscape={onDismiss}>
      {offlineSince && <OfflineNote since={offlineSince} />}
      <StatusMark tone="danger" glyph="✕" />
      <h2 id="overlay-title" className={`${HEADLINE} text-danger`}>
        {REFUSAL_TITLE[refusal]}
      </h2>
      {person && <p className={NAME}>{person.fullName}</p>}
      <p id="overlay-detail" className="max-w-sm text-ink-muted text-pretty">
        {offlineSince && refusal === 'not_found' ? OFFLINE_NOT_FOUND : REFUSAL_ADVICE[refusal]}
      </p>
      <button type="button" onClick={onDismiss} autoFocus className={SECONDARY}>
        Kembali
      </button>
    </Shell>
  )
}
