"use client";

import type { CSSProperties } from "react";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { BRAND } from "@/lib/brand";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// The root layout is what failed, so its font loaders never ran and the font
// variables are undefined. An undefined variable would void the whole
// font-family declaration, so both are pointed at system faces instead.
const fontFallback = { "--font-playfair": "Georgia", "--font-jost": "system-ui" } as CSSProperties;

/**
 * Replaces the root layout when the layout itself throws. It renders its own
 * document and nothing from the layout reaches it, so it stays deliberately
 * small. The way back reloads the whole document rather than navigating on the
 * client: after a failure this deep, a fresh page load is more likely to recover.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang="en" className="h-full antialiased" style={fontFallback}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <title>{`Something went wrong · ${BRAND.presenter}`}</title>
        <main className="paper-stripes flex flex-1 flex-col items-center px-4 py-3 sm:py-10">
          <div className="my-auto flex w-full max-w-[26.25rem] flex-col items-center gap-6 rounded-card border border-line bg-surface px-5 py-6 text-center shadow-card sm:px-8 sm:py-8 md:max-w-[30rem] md:px-10 md:py-10">
            <BrandHeader className="w-full" />

            <div>
              <h1 className="font-display text-2xl font-bold text-balance text-primary md:text-3xl">
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
                className="min-h-tap flex w-full items-center justify-center rounded-pill bg-primary px-8 font-sans text-base font-semibold py-2 text-center leading-tight tracking-[0.1em] text-balance uppercase text-on-primary shadow-card md:min-h-14 md:text-lg"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.assign(window.location.origin)}
                className="min-h-tap flex w-full items-center justify-center rounded-pill border border-line-input px-6 font-sans text-base font-semibold py-2 text-center leading-tight tracking-[0.1em] text-balance uppercase text-ink md:min-h-14 md:text-lg"
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
