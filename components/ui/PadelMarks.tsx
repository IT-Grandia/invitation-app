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
