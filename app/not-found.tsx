import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { PadelBall } from "@/components/ui/PadelMarks";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Any address the app does not know. Without this file Next.js shows its own
 * 404, which follows the phone's dark mode and offers no way back to the
 * invitation. Same frame as the ticket's not-found page.
 */
export default function NotFound() {
  return (
    <main className="paper-stripes flex flex-1 flex-col items-center px-4 py-3 sm:py-10">
      <div className="my-auto flex w-full max-w-[26.25rem] flex-col items-center gap-6 rounded-card border border-line bg-surface px-5 py-6 text-center shadow-card sm:px-8 sm:py-8 md:max-w-[30rem] md:px-10 md:py-10">
        <BrandHeader className="w-full" />

        <PadelBall className="h-14 w-14 text-primary" />

        <div>
          <h1 className="font-display text-2xl font-bold text-balance text-primary md:text-3xl">Page not found</h1>
          <p className="mt-3 text-ink-muted text-pretty">
            The link may be incomplete or out of date.
          </p>
        </div>

        <Link
          href="/"
          className="min-h-tap flex w-full items-center justify-center rounded-pill bg-primary px-8 font-sans text-base font-semibold py-2 text-center leading-tight tracking-[0.1em] text-balance uppercase text-on-primary shadow-card md:min-h-14 md:text-lg"
        >
          Back to invitation
        </Link>
      </div>
    </main>
  );
}
