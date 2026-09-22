"use client";

import type { CSSProperties } from "react";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { BRAND } from "@/lib/brand";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// The root layout is what failed, so its font loader never ran and
// --font-cormorant is undefined. Pointing it at Georgia keeps the headings in
// a serif instead of dropping to the body font.
const serifFallback = { "--font-cormorant": "Georgia" } as CSSProperties;

/**
 * Replaces the root layout when the layout itself throws. It renders its own
 * document and nothing from the layout reaches it, so it stays deliberately
 * small. The way back reloads the whole document rather than navigating on the
 * client: after a failure this deep, a fresh page load is more likely to recover.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang="en" className="h-full antialiased" style={serifFallback}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <title>{`Something went wrong · ${BRAND.lockup}`}</title>
        <main className="paper-stripes flex flex-1 flex-col items-center px-4 py-3 sm:py-10">
          <div className="my-auto flex w-full max-w-[26.25rem] flex-col items-center gap-6 rounded-card border-[3px] border-double border-line bg-surface px-5 py-6 text-center shadow-card sm:px-8 sm:py-8 md:max-w-[30rem] md:px-10 md:py-10">
            <BrandHeader className="w-full" />

            <div>
              <h1 className="font-display text-2xl font-semibold md:text-3xl">
                Something went wrong
              </h1>
              <p className="mt-3 text-ink-muted text-pretty">
                The page could not load. Please try again in a moment.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => retry()}
                className="min-h-tap flex w-full items-center justify-center rounded-pill bg-primary px-8 font-display text-lg font-semibold tracking-[0.06em] text-on-primary shadow-card md:min-h-14 md:text-xl"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.assign(window.location.origin)}
                className="min-h-tap flex w-full items-center justify-center rounded-pill border border-line-input px-6 font-display text-lg font-semibold tracking-[0.06em] text-ink md:min-h-14 md:text-xl"
              >
                Back to invitation
              </button>
            </div>

            {error.digest && (
              <p className="font-mono text-xs text-ink-muted tabular-nums">
                Error code {error.digest}
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
