'use client'

import type { ReactNode } from 'react'

import { formatWibTime } from '@/lib/datetime'

import type { Preview, PreviewStatus, Stats } from './types'

export type OverlayState =
  | { kind: 'lookup' }
  | { kind: 'preview'; preview: Preview; offlineSince?: string }
  | { kind: 'committing'; preview: Preview }
  | { kind: 'done'; fullName: string; stats: Stats; queued?: boolean }
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

const TONE: Record<PreviewStatus, string> = {
  ready: 'bg-success',
  already_used: 'bg-warning',
  cancelled: 'bg-danger',
  not_found: 'bg-danger',
  wrong_event: 'bg-danger',
}

const REFUSAL_TITLE: Record<Refusal, string> = {
  not_found: 'QR tidak dikenali',
  cancelled: 'Pendaftaran dibatalkan',
  wrong_event: 'Tiket untuk acara lain',
}

const REFUSAL_ADVICE: Record<Refusal, string> = {
  not_found: 'Minta peserta menunjukkan tiketnya, atau pakai Cari Manual.',
  cancelled: 'Arahkan peserta ke koordinator acara.',
  wrong_event: 'Minta peserta menunjukkan tiket untuk acara ini.',
}

const OFFLINE_NOT_FOUND =
  'Tidak ada di daftar yang tersimpan di HP. Kalau peserta yakin terdaftar, tunggu sinyal lalu scan ulang, atau hubungi koordinator.'

const NAME = 'font-display text-5xl leading-tight break-words'
const TICKET = 'mt-2 font-mono text-lg tracking-widest'
const PRIMARY =
  'min-h-14 w-full max-w-sm rounded-pill bg-canvas px-6 text-lg font-semibold text-ink disabled:opacity-70'
const SECONDARY =
  'min-h-14 w-full max-w-sm rounded-pill border-2 border-canvas px-6 text-lg font-semibold text-canvas disabled:opacity-50'

function refusalOf(status: PreviewStatus): Refusal {
  return status === 'ready' || status === 'already_used' ? 'not_found' : status
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="text-7xl leading-none font-bold">
      {children}
    </span>
  )
}

function OfflineNote({ since }: { since: string }) {
  return (
    <p className="rounded-pill border border-canvas px-4 py-1 text-sm font-semibold">
      Mode offline · data per {formatWibTime(since)}
    </p>
  )
}

function Shell({
  tone,
  onEscape,
  children,
}: {
  tone: string
  onEscape?: () => void
  children: ReactNode
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
      aria-describedby="overlay-detail"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onEscape) {
          onEscape()
        }
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto p-6 text-center text-canvas ${tone}`}
    >
      {children}
    </div>
  )
}

/**
 * Colour is never the only signal: every state also carries its own icon and
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
    return (
      <div
        role="status"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-success p-6 text-center text-canvas"
      >
        <Icon>{state.queued ? '✓' : '✓✓'}</Icon>
        <p className="font-display text-4xl tracking-wide uppercase">
          {state.queued ? 'Tersimpan' : 'Tercatat'}
        </p>
        <p className="text-3xl font-semibold break-words">{state.fullName}</p>
        <p className="max-w-sm text-lg">
          {state.queued
            ? 'Tersimpan di HP ini, dikirim otomatis saat sinyal kembali.'
            : `Hadir: ${state.stats.checkedIn} / ${state.stats.total}`}
        </p>
        <button type="button" onClick={onDismiss} className={SECONDARY}>
          Lanjut Scan
        </button>
      </div>
    )
  }

  if (state.kind === 'failure') {
    return (
      <Shell tone="bg-danger" onEscape={onDismiss}>
        <Icon>✕</Icon>
        <p id="overlay-title" className="font-display text-4xl leading-tight">
          Ada gangguan
        </p>
        <p id="overlay-detail" className="max-w-sm text-lg">
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
        <Shell tone="bg-danger" onEscape={onDismiss}>
          <Icon>!</Icon>
          <p id="overlay-title" className="font-display text-4xl leading-tight">
            {state.pending} check-in belum terkirim
          </p>
          <p id="overlay-detail" className="max-w-sm text-lg">
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
      <Shell tone="bg-warning" onEscape={onDismiss}>
        <p id="overlay-title" className="font-display text-4xl leading-tight">
          Keluar dari scanner?
        </p>
        <p id="overlay-detail" className="max-w-sm text-lg">
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
      <Shell tone={TONE.ready} onEscape={committing ? undefined : onDismiss}>
        {offlineSince && <OfflineNote since={offlineSince} />}
        <Icon>✓</Icon>
        <div>
          <p id="overlay-title" className={NAME}>
            {person.fullName}
          </p>
          <p className={TICKET}>{person.ticketNumber}</p>
        </div>
        <p id="overlay-detail" className="max-w-sm text-lg">
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
      <Shell tone={TONE.already_used} onEscape={onDismiss}>
        {offlineSince && <OfflineNote since={offlineSince} />}
        <Icon>!</Icon>
        <div>
          <p id="overlay-title" className={NAME}>
            {person.fullName}
          </p>
          <p className={TICKET}>{person.ticketNumber}</p>
        </div>
        <div id="overlay-detail" className="text-lg">
          <p className="font-semibold">
            {person.checkedInAt
              ? `Sudah check-in pukul ${formatWibTime(person.checkedInAt)}`
              : 'Sudah check-in'}
          </p>
          {person.checkedInBy && <p>oleh {person.checkedInBy}</p>}
        </div>
        <button type="button" onClick={onDismiss} autoFocus className={SECONDARY}>
          Kembali
        </button>
      </Shell>
    )
  }

  const refusal = refusalOf(preview.status)

  return (
    <Shell tone={TONE[refusal]} onEscape={onDismiss}>
      {offlineSince && <OfflineNote since={offlineSince} />}
      <Icon>✕</Icon>
      <p id="overlay-title" className="font-display text-4xl leading-tight">
        {REFUSAL_TITLE[refusal]}
      </p>
      {person && <p className="text-2xl font-semibold break-words">{person.fullName}</p>}
      <p id="overlay-detail" className="max-w-sm text-lg">
        {offlineSince && refusal === 'not_found' ? OFFLINE_NOT_FOUND : REFUSAL_ADVICE[refusal]}
      </p>
      <button type="button" onClick={onDismiss} autoFocus className={SECONDARY}>
        Kembali
      </button>
    </Shell>
  )
}
