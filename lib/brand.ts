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

/** An image that stands on its own, so it carries its own alt text. */
export type BrandImage = ImageFile & {
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
  /** The logos printed above the flyer until the organiser sent it without them. */
  presenters: {
    src: "/brand/presenters.webp",
    width: 1855,
    height: 228,
    alt: "The Grandia Group, BINUS School Semarang, Immoderma, and Bank Jateng.",
  },
  /**
   * The organiser's flyer, in two crops of the same file. A phone gets the
   * square middle — the title and the two rackets — because the wide version
   * shrinks to a strip there; anything from 640px up gets the whole picture,
   * balls and all.
   */
  flyer: {
    alt: "FA Live Padel Society. The Grandia Group presents, powered by BINUS School Semarang and Immoderma Skin Clinic.",
    square: { src: "/brand/flyer-square.webp", width: 780, height: 780 },
    wide: { src: "/brand/flyer-wide.webp", width: 1536, height: 1024 },
  },
  /** Printed at the foot of the flyer until the organiser sent it without them. */
  communities: {
    womenpreneur: {
      src: "/brand/community-womenpreneur.webp",
      width: 1497,
      height: 696,
      alt: "Womenpreneur BPD HIPMI Jawa Tengah",
    },
    club79: {
      src: "/brand/community-club79.webp",
      width: 593,
      height: 121,
      alt: "Club 79",
    },
  },
  /**
   * The supporters' logos, prepared for the cream card and used whole. The
   * community partners are left out: they have their own place on the cover.
   */
  sponsors: {
    src: "/brand/sponsors-supported.webp",
    width: 1927,
    height: 545,
    alt: "Hypelux, Hype Sneaker, Friday, Margaria Indonesia's Batik, Bohopanna, Liekuang & Co., Padel Port, Bobo Sprinkle Kids, SMC RS Telogorejo, Syailendra Elektronik, and Nasmoco Gombel.",
  },
} as const satisfies {
  presenter: string;
  presenters: BrandImage;
  flyer: { alt: string; square: ImageFile; wide: ImageFile };
  communities: Record<"womenpreneur" | "club79", BrandImage>;
  sponsors: BrandImage;
};
