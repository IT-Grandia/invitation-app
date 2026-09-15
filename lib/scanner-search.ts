import { ticketNumber } from './token'

// Field names are single letters on purpose: the whole list is downloaded at the
// venue over a weak connection, and with several hundred rows every byte counts.
export type ManifestEntry = {
  t: string // token
  n: string // full name
  c: string | null // check-in time, null until the participant arrives
  g?: string | null // community code, shown on the check-in screen
}

export type Manifest = {
  eventId: string
  eventName: string
  updatedAt: string
  total: number
  entries: ManifestEntry[]
}

export const MIN_QUERY_LENGTH = 2

export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Ranks a match at the start of the name first, then at the start of any word in
 * it, then anywhere. The ticket number printed under the QR code is matched too,
 * because it is what a participant can still read out when the code will not scan.
 */
export function searchManifest(
  entries: ManifestEntry[],
  query: string,
  limit = 20,
): ManifestEntry[] {
  const needle = normalizeForSearch(query)

  if (needle.length < MIN_QUERY_LENGTH) {
    return []
  }

  const byName: ManifestEntry[] = []
  const byWord: ManifestEntry[] = []
  const byFragment: ManifestEntry[] = []

  for (const entry of entries) {
    const name = normalizeForSearch(entry.n)

    if (name.startsWith(needle) || ticketNumber(entry.t).toLowerCase().startsWith(needle)) {
      byName.push(entry)
    } else if (name.split(' ').some((word) => word.startsWith(needle))) {
      byWord.push(entry)
    } else if (name.includes(needle)) {
      byFragment.push(entry)
    }
  }

  return [...byName, ...byWord, ...byFragment].slice(0, limit)
}
