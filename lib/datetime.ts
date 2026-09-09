import { formatInTimeZone } from 'date-fns-tz'
import { id } from 'date-fns/locale'

export const EVENT_TIME_ZONE = 'Asia/Jakarta'

// Timestamps are stored in UTC and only converted at the presentation layer, so
// every participant sees the same wall-clock time regardless of device settings.
function format(value: Date | string, pattern: string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return formatInTimeZone(date, EVENT_TIME_ZONE, pattern, { locale: id })
}

/** `26 Sep 2026, 08:00` */
export function formatWib(value: Date | string): string {
  return format(value, 'd MMM yyyy, HH:mm')
}

/** `Sabtu, 26 September 2026` */
export function formatWibDateLong(value: Date | string): string {
  return format(value, 'EEEE, d MMMM yyyy')
}

/** `26 Sep 2026` */
export function formatWibDate(value: Date | string): string {
  return format(value, 'd MMM yyyy')
}

/** `08:00` */
export function formatWibTime(value: Date | string): string {
  return format(value, 'HH:mm')
}

export function isWithin(start: Date, end: Date, now: Date = new Date()): boolean {
  return now >= start && now <= end
}
