/**
 * The brand lines: who is inviting, the tagline, who supports the event.
 *
 * This is the one deliberate exception to "event content lives in the
 * database" (DESIGN.md section 4). Everything here is identity, not schedule:
 * it does not change between events the way a date or a venue does, and the
 * logos it will eventually point at are files, which a database row cannot
 * hold. The event name, date, time and venue still come from `events`.
 *
 * Logos are placeholders until the organiser supplies them (DESIGN.md
 * section 4): a sponsor without a `logo` is rendered as its name in the serif,
 * and the layout is sized so the real file drops in without moving anything.
 */

export type Sponsor = {
  /** Shown as text until the logo arrives, and as the logo's alt text after. */
  name: string;
  /** Path under /public/brand once the organiser has sent the file. */
  logo?: string;
  href?: string;
};

/** Cover and ticket header, in reading order. Rendered uppercase by CSS. */
export const PARTNERS: readonly string[] = ["Grandia", "Folkafe"];

const SPONSORS: readonly Sponsor[] = [
  { name: "Grandia" },
  { name: "Folkafe" },
  { name: "Padel79" },
];

/**
 * The venue's own mark, supplied by the organiser. Shown in place of the
 * venue name wherever the event in the database is held at this venue — the
 * name is still the source of truth, so a change of venue falls back to text
 * on its own rather than showing the wrong logo. Trimmed to the artwork:
 * 443 × 118, served through next/image.
 */
export const VENUE_LOGO = {
  name: "Padel Ground",
  src: "/brand/padel-ground.png",
  width: 443,
  height: 118,
} as const;

/**
 * The logo for a venue name, or null when no logo matches it.
 *
 * The committee writes the venue as they like — "Padel Ground", "Padel
 * Ground, Semarang", "PADEL GROUND (Siranda)" — so the match is on the
 * leading words up to a separator, not the whole string. "Padel Grounds"
 * or "Old Padel Ground" would still be a different place and get no logo.
 */
export function venueLogoFor(venueName: string): typeof VENUE_LOGO | null {
  const name = venueName.trim().toLowerCase().replace(/\s+/g, " ");
  const logoName = VENUE_LOGO.name.toLowerCase();

  if (!name.startsWith(logoName)) return null;

  const rest = name.slice(logoName.length);
  return rest === "" || /^[\s,.\-–—(/|]/.test(rest) ? VENUE_LOGO : null;
}

export const BRAND = {
  /** `Grandia × Folkafe` — the multiplication sign, not the letter x. */
  lockup: PARTNERS.join(" × "),
  /**
   * The line that heads the cover, in place of the event name. The event
   * itself is called "FA Live Padel Society" in the database and appears
   * under that name in titles, the WhatsApp message and the spreadsheet;
   * this is the description the organiser wants people to read first.
   */
  headline: "Padel, Coffee, & Business Networking",
  /** With full stops, as the organiser's mockup writes it. */
  tagline: "Play. Connect. Build.",
  supportedByLabel: "Supported by",
  sponsors: SPONSORS,
} as const;
