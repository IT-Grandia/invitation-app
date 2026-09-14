import type { CSSProperties } from "react";

/**
 * The green check that sits over a used QR code once a participant is checked
 * in (DESIGN.md section 6.4) — on their own phone and on the scanner. Same
 * component in both places so the two screens cannot drift apart.
 *
 * The disc takes `currentColor`, so `text-primary` on the caller colours it
 * from the token; the tick is drawn in `--on-primary` for the same reason.
 * The tick itself is Lucide's `check`, scaled to leave room inside the disc.
 *
 * Decorative by default: the text next to it ("Checked In") carries the
 * meaning. Pass `title` only where the mark stands alone.
 */

type CheckMarkProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export function CheckMark({
  className = "h-24 w-24 text-primary",
  style,
  title,
}: CheckMarkProps) {
  const a11y = title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const };

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={style}
      focusable="false"
      {...a11y}
    >
      <circle cx="24" cy="24" r="24" fill="currentColor" />
      <path
        d="M35 16 20 31l-7-7"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
