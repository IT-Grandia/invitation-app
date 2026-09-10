export type PreviewStatus = 'ready' | 'already_used' | 'not_found' | 'cancelled' | 'wrong_event'

export type TicketSummary = {
  ticketNumber: string
  fullName: string
  checkedInAt: string | null
  checkedInBy: string | null
}

export type Preview = {
  status: PreviewStatus
  canCheckIn: boolean
  registration: TicketSummary | null
}

export type Stats = {
  checkedIn: number
  total: number
}

export type Session = {
  event: { name: string }
  stats: Stats
}
