export type AdminEventSummary = {
  name: string
  status: string
  startsAt: string
  capacity: number | null
}

export type AdminTotals = {
  registered: number
  checkedIn: number
  notCheckedIn: number
  waitlist: number
  cancelled: number
  remaining: number | null
}

export type AdminSheetSync = {
  pending: number
  lastSyncedAt: string | null
}

export type AdminLastCheckIn = {
  checkedInAt: string
  checkedInBy: string | null
}

export type AdminStatsResponse = {
  event: AdminEventSummary
  totals: AdminTotals
  sheetSync: AdminSheetSync
  lastCheckIn: AdminLastCheckIn | null
}

