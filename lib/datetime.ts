import { formatInTimeZone } from 'date-fns-tz'
import { enGB, id } from 'date-fns/locale'

export const EVENT_TIME_ZONE = 'Asia/Jakarta'

/**
 * Participant-facing pages are written in English (DESIGN.md section 5);
 * staff, admin and the spreadsheet stay in Indonesian. The default keeps every
 * existing caller unchanged.
 */
export type DateLocale = 'id' | 'en'

const LOCALES = { id, en: enGB } as const

// Timestamps are stored in UTC and only converted at the presentation layer, so
// every participant sees the same wall-clock time regardless of device settings.
function format(value: Date | string, pattern: string, locale: DateLocale): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return formatInTimeZone(date, EVENT_TIME_ZONE, pattern, { locale: LOCALES[locale] })
}

/** `26 Sep 2026, 08:00` */
export function formatWib(value: Date | string, locale: DateLocale = 'id'): string {
  return format(value, 'd MMM yyyy, HH:mm', locale)
}

/** `Sabtu, 26 September 2026` — or `Saturday, 26 September 2026` in English */
export function formatWibDateLong(value: Date | string, locale: DateLocale = 'id'): string {
  return format(value, 'EEEE, d MMMM yyyy', locale)
}

/** `26 Sep 2026` */
export function formatWibDate(value: Date | string, locale: DateLocale = 'id'): string {
  return format(value, 'd MMM yyyy', locale)
}

/** `08:00` — digits only, so no locale */
export function formatWibTime(value: Date | string): string {
  return format(value, 'HH:mm', 'id')
}

export function isWithin(start: Date, end: Date, now: Date = new Date()): boolean {
  return now >= start && now <= end
}
