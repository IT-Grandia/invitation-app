import type { Metadata } from 'next'

import { Scanner } from '@/components/scanner/Scanner'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Check-in Petugas',
  robots: { index: false, follow: false },
}

export default function ScanPage() {
  // The palette is pinned rather than following the time of day: an officer
  // working the gate needs the same colours at 06:00 and at 18:00, and the
  // status tones have to stay recognisable throughout.
  return (
    <div data-theme="court-night" className="min-h-dvh bg-canvas text-ink">
      <Scanner />
    </div>
  )
}
