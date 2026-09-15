import { BRAND } from "@/lib/brand";

/**
 * "Supported by" and the sponsor row on the cover — DESIGN.md section 6.1.
 *
 * Names in the serif until the organiser sends logos; each entry is then
 * swapped for an image with the name as alt text, at the same 28px height,
 * so nothing moves when the files arrive. The dot between names is drawn by
 * CSS, so the list reads as three items and nothing else.
 */
export function SupportedBy() {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-display text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase md:text-sm">
        {BRAND.supportedByLabel}
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-y-1">
        {BRAND.sponsors.map((sponsor) => (
          <li
            key={sponsor.name}
            className="flex h-7 items-center font-display text-xs font-semibold tracking-[0.16em] uppercase before:mx-2.5 before:text-line-input before:content-['·'] first:before:hidden md:text-sm"
          >
            {sponsor.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
