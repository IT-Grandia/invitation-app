'use client'

import { useState } from 'react'

import { loadStaffLabel, storeStaffLabel } from '@/lib/scanner-session'

export function StaffLabel() {
  // Only mounted once access has been granted, which always happens after
  // hydration, so reading storage here cannot diverge from the server markup.
  const [value, setValue] = useState(() => loadStaffLabel() ?? '')

  return (
    <label className="flex items-center gap-3 rounded-card bg-surface px-4 py-2">
      <span className="shrink-0 text-sm text-ink-muted">Pos petugas</span>
      <input
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          storeStaffLabel(event.target.value)
        }}
        placeholder="mis. Gate A - Rina"
        maxLength={80}
        autoComplete="off"
        className="min-h-tap w-full bg-transparent text-ink placeholder:text-ink-muted"
      />
    </label>
  )
}
