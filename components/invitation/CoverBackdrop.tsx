"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

/**
 * The layer behind the cover — DESIGN.md section 5.1: the striped wall and the
 * organiser's flyer on it, pinned while the page scrolls. The flyer carries
 * every logo, the supporters and the community partners included, so nothing
 * else is set around it.
 *
 * Once the card named by `revealId` has risen past the lower fifth of the
 * screen, the whole layer blurs and fades back so the eye moves to the card,
 * and it sharpens again when the visitor scrolls back up. Blurring the stripes
 * with the flyer keeps its edge from standing out against a sharp background.
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
        {/* Placed within svh, not dvh: dvh follows the address bar in and out,
            and the flyer would jump in size. */}
        <div className="flex h-svh items-center justify-center pt-4 pb-24 sm:px-6 sm:pt-8 sm:pb-28">
          {/* One file is fetched, not two: a second <Image> hidden with CSS
              would still be downloaded. Edge to edge on a phone, framed from
              640px up. The height cap keeps the whole flyer on a short screen,
              a phone held sideways among them. */}
          <picture className="transition-[scale] duration-500 ease-out motion-safe:group-data-blurred:scale-105">
            <source media="(min-width: 640px)" srcSet={flyer.wide.src} />
            <img
              src={flyer.portrait.src}
              alt={flyer.alt}
              width={flyer.portrait.width}
              height={flyer.portrait.height}
              fetchPriority="high"
              decoding="async"
              className="block h-auto max-h-[calc(100svh-8rem)] w-auto max-w-full sm:max-h-[calc(100svh-10rem)] sm:max-w-[42rem] sm:rounded-card sm:shadow-card lg:max-w-[56rem]"
            />
          </picture>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="keep-fade absolute inset-0 bg-canvas opacity-0 transition-opacity duration-500 ease-out group-data-blurred:opacity-40"
      />
    </div>
  );
}
