/**
 * Minimal iCalendar (RFC 5545) writer for the one event this site serves.
 *
 * Times are emitted in UTC with the `Z` suffix rather than as a local time
 * with a TZID block: every calendar app converts UTC correctly, whereas a
 * TZID needs a matching VTIMEZONE definition that this file would have to
 * carry along. The participant's calendar shows 08:00 WIB either way.
 */

export type IcsEvent = {
  /** Stable identifier — the event's database id is a fine choice. */
  uid: string
  summary: string
  description?: string | null
  location?: string | null
  url?: string | null
  startsAt: Date
  endsAt: Date
}

/** `20260926T010000Z` */
function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/** RFC 5545 section 3.3.11: backslash, semicolon, comma and newline are escaped. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * RFC 5545 section 3.1: lines longer than 75 octets are folded onto a
 * continuation line that starts with a single space. Folding by characters is
 * a safe approximation here because the copy is ASCII plus the odd em dash.
 */
function foldLine(line: string): string {
  const parts: string[] = []
  for (let i = 0; i < line.length; i += 74) {
    parts.push((i === 0 ? '' : ' ') + line.slice(i, i + 74))
  }
  return parts.join('\r\n')
}

export function buildIcs(event: IcsEvent, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Padel Day//Invitation//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(event.startsAt)}`,
    `DTEND:${formatUtc(event.endsAt)}`,
    `SUMMARY:${escapeText(event.summary)}`,
  ]

  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  if (event.url) lines.push(`URL:${event.url}`)

  lines.push('END:VEVENT', 'END:VCALENDAR')

  // The spec requires CRLF, and a trailing one so the last line is terminated.
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
