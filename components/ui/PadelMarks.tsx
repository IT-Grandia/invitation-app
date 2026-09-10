/**
 * Padel marks, drawn by hand as inline SVG.
 *
 * No icon library ships padel: the closest match is a tennis racket, and a
 * tennis racket has strings while a padel racket is a solid perforated blade.
 * Anyone who actually plays notices immediately, and the invitation starts
 * looking borrowed.
 *
 * Drawing them here buys four things at once — no dependency, no licence to
 * track, no extra HTTP request, and `currentColor` throughout, so every mark
 * follows the design tokens without being touched again when the palette moves.
 *
 * For generic interface icons (calendar, map pin, share, download) use Lucide
 * instead — ISC licensed, and single SVGs can be copied from lucide.dev without
 * installing a package, which keeps package.json out of this.
 *
 * All marks are decorative by default. Pass a `title` only when the mark is the
 * sole carrier of meaning; otherwise leave it aria-hidden.
 */

import type { CSSProperties } from "react";

type MarkProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
};

function markA11y(title?: string) {
  return title
    ? ({ role: "img" as const, "aria-label": title })
    : ({ "aria-hidden": true as const });
}

/** Padel ball: a sphere with the two curved seams every ball has. */
export function PadelBall({ className, style, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className={className}
      style={style}
      {...markA11y(title)}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M5.2 5.6c2.9 2.2 4.3 5 4.3 8.1 0 2.2-.6 4.2-1.9 6" />
      <path d="M18.8 5.6c-2.9 2.2-4.3 5-4.3 8.1 0 2.2.6 4.2 1.9 6" />
    </svg>
  );
}

/**
 * Player mid-swing, from the artwork the committee supplied.
 *
 * Rendered as a CSS mask rather than an <img>: only the alpha channel is kept,
 * and the colour comes from `currentColor`. That means the silhouette follows
 * the palette on its own — change `--primary` and this changes with it — and
 * the file drops from 91 KB to 6 KB, since none of the colour data ships.
 *
 * Give it a width; the aspect ratio holds the height. Safari needs the
 * -webkit- prefix through iOS 15, which is our floor.
 */
export function PadelPlayer({ className, style, title }: MarkProps) {
  const maskUrl = "url(/padel-player.png)";

  return (
    <span
      className={className}
      style={{
        display: "block",
        aspectRatio: "577 / 432",
        backgroundColor: "currentColor",
        WebkitMaskImage: maskUrl,
        maskImage: maskUrl,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
      {...markA11y(title)}
    />
  );
}

/**
 * A padel court seen from above, drawn to the real proportions: 20 m by 10 m,
 * net across the middle, service lines 6.95 m out from the net, and the centre
 * line splitting each pair of service boxes.
 *
 * Used as the hero backdrop at low opacity. It stands in for the venue photo
 * the committee has not supplied yet, and costs about two kilobytes inline
 * against roughly a hundred and fifty for a photograph.
 */
export function PadelCourt({ className, style, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 200 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      vectorEffect="non-scaling-stroke"
      className={className}
      style={style}
      {...markA11y(title)}
    >
      <rect x="0.7" y="0.7" width="198.6" height="98.6" rx="1.5" />
      {/* Net */}
      <line x1="100" y1="0" x2="100" y2="100" strokeWidth={2} />
      {/* Service lines, 6.95 m either side of the net */}
      <line x1="30.5" y1="0" x2="30.5" y2="100" />
      <line x1="169.5" y1="0" x2="169.5" y2="100" />
      {/* Centre line through both service boxes */}
      <line x1="30.5" y1="50" x2="169.5" y2="50" />
    </svg>
  );
}
