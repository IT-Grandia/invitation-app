import { Fragment } from "react";
import { PARTNERS } from "@/lib/brand";

/**
 * `GRANDIA × FOLKAFE` — the same header on every screen a participant sees
 * (DESIGN.md section 6.0): cover, registration form, ticket, and the
 * checked-in screen. Dev A and Dev C import it as is; the look lives here.
 *
 * Text only until the organiser sends logos. The row is sized for a 32px logo
 * above the lockup so the files drop in later without moving anything.
 */

type BrandHeaderProps = {
  className?: string;
};

export function BrandHeader({ className = "" }: BrandHeaderProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 border-b border-line pb-4 text-center ${className}`}
    >
      <p className="font-display text-base font-semibold tracking-[0.2em] text-primary uppercase sm:text-lg">
        {PARTNERS.map((name, index) => (
          <Fragment key={name}>
            {index > 0 && (
              <>
                {/* Screen readers say "and"; sighted readers see the sign. */}
                <span className="sr-only"> and </span>
                <span aria-hidden="true" className="mx-2 text-ink-muted">
                  ×
                </span>
              </>
            )}
            {name}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
