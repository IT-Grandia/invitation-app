"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

/**
 * The layer behind the cover — DESIGN.md section 5.1: the striped wall and
 * the flyer on it, pinned for the whole page. Once the card named by
 * `revealId` has risen past the lower fifth of the screen, the whole layer
 * blurs and fades back so the eye moves to the card; it sharpens again when
 * the visitor scrolls back up. Blurring the stripes with the flyer keeps the
 * flyer's edge from standing out against a sharp background.
 *
 * The blur is switched, not scrubbed: a filter recomputed on every scroll
 * frame stutters on a cheap phone, a single transition does not. Without
 * JavaScript the layer simply stays sharp.
 */

type CoverBackdropProps = {
  revealId: string;
};

export function CoverBackdrop({ revealId }: CoverBackdropProps) {
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    const target = document.getElementById(revealId);
    if (!target) return;

    // Still blurred once the card has scrolled past the top of the screen.
    const observer = new IntersectionObserver(
      ([entry]) => setBlurred(entry.isIntersecting || entry.boundingClientRect.top < 0),
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [revealId]);

  const { flyer } = BRAND;

  return (
    // lvh, the screen with the address bar hidden, so the layer always covers
    // it; the negative margin takes the layer out of the flow, and the page
    // scrolls over it.
    <div
      data-blurred={blurred || undefined}
      className="group sticky top-0 -mb-[100lvh] h-lvh overflow-hidden bg-canvas"
    >
      <div className="keep-fade paper-stripes absolute inset-0 transition-[filter] duration-500 ease-out group-data-blurred:blur-md">
        {/* The flyer is placed within svh, not dvh: dvh follows the address
            bar in and out, and the flyer would jump in size. */}
        <div className="flex h-svh items-center justify-center pt-4 pb-24 sm:px-6 sm:pt-8 sm:pb-28">
          {/* The width is bounded by the screen's width and, through the
              flyer's 3:4, by its height, so the whole flyer is always in view.
              It is set here rather than left to the image: the file's own
              width changes with the candidate the browser picks. */}
          <div className="w-[min(100%,calc((100svh-7rem)*3/4))] overflow-hidden transition-[scale] duration-500 ease-out motion-safe:group-data-blurred:scale-105 sm:w-[min(100%,calc((100svh-9rem)*3/4))] sm:rounded-card sm:shadow-card">
            <Image
              src={flyer.src}
              alt={flyer.alt}
              width={flyer.width}
              height={flyer.height}
              priority
              sizes="(max-width: 639px) 100vw, 600px"
              className="block h-auto w-full"
            />
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="keep-fade absolute inset-0 bg-canvas opacity-0 transition-opacity duration-500 ease-out group-data-blurred:opacity-40"
      />
    </div>
  );
}
