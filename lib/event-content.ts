import type { EventDetailItem } from '@/components/invitation/EventDetails'
import type { RundownEntry } from '@/components/invitation/Rundown'

/**
 * Event copy that has no column in the database yet.
 *
 * Everything else on the invitation now comes from `events` through
 * getPublishedEvent(). These two blocks are the exception: docs/01-PRD.md
 * section 10.1 expects the committee to edit the rundown without a redeploy,
 * but docs/03-DATA-MODEL.md gives `events` no place to hold it. A `content`
 * column (jsonb) was requested from Dev C — migrations are forward-only, so it
 * is their call.
 *
 * Until then this is the single file to edit, and the single file to delete
 * once the column lands. The wording is a stand-in the committee must review
 * before registration opens on 17 September.
 */

export const EVENT_DETAILS: readonly EventDetailItem[] = [
  {
    label: 'Format',
    value: 'Main santai dengan rotasi pasangan. Bukan turnamen, tidak ada babak gugur.',
  },
  {
    label: 'Level',
    value: 'Terbuka untuk semua. Belum pernah main padel sama sekali juga boleh ikut.',
  },
  {
    label: 'Bawa apa',
    value:
      'Sepatu non-marking, botol minum, dan handuk kecil. Raket ada pinjaman kalau kamu belum punya.',
  },
  {
    label: 'Dress code',
    value: 'Baju olahraga bebas. Yang penting nyaman buat gerak.',
  },
]

export const EVENT_RUNDOWN: readonly RundownEntry[] = [
  { time: '08.00', activity: 'Registrasi ulang dan scan tiket' },
  { time: '08.30', activity: 'Pemanasan bersama' },
  { time: '09.00', activity: 'Sesi main dimulai' },
  { time: '12.00', activity: 'Istirahat dan makan siang' },
  { time: '13.00', activity: 'Sesi main lanjut' },
  { time: '16.30', activity: 'Foto bersama' },
  { time: '17.00', activity: 'Selesai' },
]
