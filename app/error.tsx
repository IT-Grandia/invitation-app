"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { PadelBall } from "@/components/ui/PadelMarks";
import { BRAND } from "@/lib/brand";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/**
 * Shown when a page fails to render, most likely because the database cannot
 * be reached. The message itself is never displayed: in production it is a
 * generic string, and the digest is what matches the server log, so that is
 * what a participant can pass on to the organiser.
 */
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="paper-stripes flex flex-1 flex-col items-center px-4 py-3 sm:py-10">
      {/* Error boundaries cannot export metadata, and the page's own title failed
          with it, so the tab would otherwise show the bare address. */}
      <title>{`Something went wrong · ${BRAND.lockup}`}</title>
      <div className="my-auto flex w-full max-w-[26.25rem] flex-col items-center gap-6 rounded-card border-[3px] border-double border-line bg-surface px-5 py-6 text-center shadow-card sm:px-8 sm:py-8 md:max-w-[30rem] md:px-10 md:py-10">
        <BrandHeader className="w-full" />

        <PadelBall className="h-14 w-14 text-primary" />

        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Something went wrong</h1>
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
          <Link
            href="/"
            className="min-h-tap flex w-full items-center justify-center rounded-pill border border-line-input px-6 font-display text-lg font-semibold tracking-[0.06em] text-ink md:min-h-14 md:text-xl"
          >
            Back to invitation
          </Link>
        </div>

        {error.digest && (
          <p className="font-mono text-xs text-ink-muted tabular-nums">Error code {error.digest}</p>
        )}
      </div>
    </main>
  );
}
