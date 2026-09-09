/**
 * Time-of-day theming for the invitation.
 *
 * Owned by Dev B as part of the design system. Resolved on the server from
 * Jakarta wall-clock time, never from the visitor's device clock: a client-side
 * decision repaints the page after hydration, and that flash is exactly what
 * docs/01-PRD.md section 8 forbids for the ticket banner. Server-side costs us
 * nothing because the invitation page is already dynamic — it reads the ticket
 * cookie.
 *
 * Every participant is in Indonesia and the event is in Jakarta, so WIB is the
 * correct clock here rather than a compromise.
 *
 * Scope: the <html> element, which means the invitation page. Pages that need a
 * fixed palette pin it on their own wrapper instead, e.g.
 *   <div data-theme="sunday-rally">...</div>
 * The ticket page does this deliberately — see components/ticket.
 */

export const THEMES = ["court-night", "sunday-rally"] as const;

export type ThemeId = (typeof THEMES)[number];

/**
 * Jakarta sits near the equator, so sunrise (~05:40) and sunset (~17:45) barely
 * move across the year and these two constants can stay fixed. Nudge them here
 * rather than at the call sites.
 */
const LIGHT_STARTS_AT_MINUTE = 5 * 60 + 30; // 05:30 WIB
const DARK_STARTS_AT_MINUTE = 17 * 60 + 30; // 17:30 WIB

/** Minutes elapsed since midnight in Asia/Jakarta, whatever the server's zone. */
export function jakartaMinutesOfDay(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
}

/**
 * Daytime in Jakarta gets the light palette, evening and night get the dark one.
 *
 * A useful side effect: the event itself runs 08:00-17:00, so the light palette
 * is what participants see at the venue — the one that stays readable in direct
 * sunlight, as docs/05-UX-FLOWS.md section 4.1 requires.
 */
export function resolveTheme(instant: Date = new Date()): ThemeId {
  const minuteOfDay = jakartaMinutesOfDay(instant);

  return minuteOfDay >= LIGHT_STARTS_AT_MINUTE && minuteOfDay < DARK_STARTS_AT_MINUTE
    ? "sunday-rally"
    : "court-night";
}

/** Guards the ?theme= override, which exists so the team can review either
 *  palette without waiting for the clock. */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}
