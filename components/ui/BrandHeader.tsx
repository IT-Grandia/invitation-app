import { BRAND } from "@/lib/brand";

/**
 * `THE GRANDIA GROUP`, set as on the flyer, on every screen a participant sees
 * except the cover, where the flyer itself carries it (DESIGN.md section 3):
 * registration form, ticket, error pages, and the checked-in screen. Dev A and
 * Dev C import it as is; the look lives here.
 */

type BrandHeaderProps = {
  className?: string;
};

export function BrandHeader({ className = "" }: BrandHeaderProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 border-b border-line pb-4 text-center ${className}`}
    >
      <p className="font-sans text-sm font-bold tracking-[0.08em] text-ink uppercase md:text-base">
        {BRAND.presenter}
      </p>
    </div>
  );
}
