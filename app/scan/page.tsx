import type { Metadata } from 'next'

import { Scanner } from '@/components/scanner/Scanner'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Check-in Petugas',
  robots: { index: false, follow: false },
}

export default function ScanPage() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <Scanner />
    </div>
  )
}
