/**
 * The brand: who presents the event, the flyer, the sponsors, the venue mark.
 *
 * This is the one deliberate exception to "event content lives in the
 * database" (DESIGN.md section 1). Everything here is identity, not schedule,
 * and most of it is artwork the organiser supplied as files, which a database
 * row cannot hold. The event name, date, time and venue still come from
 * `events`.
 */

/** A file under /public/brand with its intrinsic size, for next/image. */
export type BrandImage = {
  src: string;
  width: number;
  height: number;
  /** The artwork is mostly text, so the alt text reads it out in full. */
  alt: string;
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
  presents: "Presents",
  /** The organiser's flyer, 3:4. It heads the cover in place of any headline. */
  flyer: {
    src: "/brand/flyer.webp",
    width: 1086,
    height: 1448,
    alt: "FA Live Padel Society. The Grandia Group presents, powered by BINUS School Semarang and Immoderma Skin Clinic. With the logos of The Grandia Group, BINUS School Semarang, Immoderma, and Bank Jateng. Community partners: Womenpreneur BPD HIPMI Jawa Tengah and Club 79.",
  },
  /**
   * The organiser's sponsor board, cut in two at its divider and without its
   * two captions, which the cover sets as text. Whole, it is 2000px wide and
   * its logos shrink past reading on a phone; stacked, each half gets the
   * full width of the column.
   */
  sponsors: {
    supported: {
      src: "/brand/sponsors-supported.webp",
      width: 1403,
      height: 410,
      alt: "Hypelux, Hype Sneaker, Friday, Margaria Indonesia's Batik, Bohopanna, Liekuang & Co., Padel Port, Bobo Sprinkle Kids, SMC RS Telogorejo, Syailendra Elektronik, and Nasmoco Gombel.",
    },
    community: {
      src: "/brand/sponsors-community.webp",
      width: 252,
      height: 229,
      alt: "Womenpreneur BPD HIPMI Jawa Tengah and Club 79.",
    },
  },
} as const satisfies {
  presenter: string;
  presents: string;
  flyer: BrandImage;
  sponsors: Record<"supported" | "community", BrandImage>;
};
