/**
 * The brand: who presents the event, the flyer, the sponsors, the venue mark.
 *
 * This is the one deliberate exception to "event content lives in the
 * database" (DESIGN.md section 1). Everything here is identity, not schedule,
 * and most of it is artwork the organiser supplied as files, which a database
 * row cannot hold. The event name, date, time and venue still come from
 * `events`.
 */

/** A file under /public/brand with its intrinsic size. */
export type ImageFile = {
  src: string;
  width: number;
  height: number;
};

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
  /** Rendered uppercase by CSS, as on the flyer. Also the site name in titles. */
  presenter: "The Grandia Group",
  /**
   * The organiser's flyer, which carries every logo: the presenters, the
   * supporters, and the community partners. It comes in two crops of the same
   * file. A phone gets the middle column, all the content without the balls at
   * the sides, because the whole picture shrinks to a strip there; anything
   * from 640px up gets the whole picture.
   *
   * The flyer is the only place the supporters appear, so the alt text names
   * every one of them.
   */
  flyer: {
    alt: "FA Live Padel Society. The Grandia Group presents, powered by BINUS School Semarang and Immoderma Skin Clinic, with Bank Jateng. Supported by Hypelux, Hype Sneaker, Friday, Margaria Indonesia's Batik, Bohopanna, Liekuang & Co., Padel Port, Bobo Sprinkle Kids, SMC RS Telogorejo, Syailendra Elektronik, and Nasmoco Gombel. Community partners: Womenpreneur BPD HIPMI Jawa Tengah and Club 79.",
    portrait: { src: "/brand/flyer-portrait.webp", width: 640, height: 896 },
    wide: { src: "/brand/flyer-wide.webp", width: 1345, height: 896 },
  },
} as const satisfies {
  presenter: string;
  flyer: { alt: string; portrait: ImageFile; wide: ImageFile };
};
