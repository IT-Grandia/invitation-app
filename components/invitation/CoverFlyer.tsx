"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

/**
 * The flyer behind the cover — DESIGN.md section 5.1. The cover pins it while
 * the page scrolls; once the card named by `revealId` has risen past the lower
 * fifth of the screen, the flyer blurs and fades back so the eye moves to the
 * card, and it sharpens again when the visitor scrolls back up.
 *
 * The blur is switched, not scrubbed: a filter recomputed on every scroll
 * frame stutters on a cheap phone, a single transition does not. Without
 * JavaScript the flyer simply stays sharp.
 */

type CoverFlyerProps = {
  revealId: string;
};

export function CoverFlyer({ revealId }: CoverFlyerProps) {
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
    <div
      data-blurred={blurred || undefined}
      className="group relative w-[min(100%,calc((100svh-6rem)*3/4))] overflow-hidden sm:w-[min(100%,calc((100svh-8rem)*3/4))] sm:rounded-card sm:shadow-card"
    >
      {/* The width above is bounded by the screen's width and, through the
          flyer's 3:4, by its height, so the whole flyer is always in view. It
          is set here rather than left to the image: the file's own width
          changes with the candidate the browser picks. The slight zoom while
          blurred pushes the soft, blurred edges outside the frame. */}
      <Image
        src={flyer.src}
        alt={flyer.alt}
        width={flyer.width}
        height={flyer.height}
        priority
        sizes="(max-width: 639px) 100vw, 600px"
        className="block h-auto w-full transition-[filter,scale] duration-500 ease-out group-data-blurred:scale-105 group-data-blurred:blur-md"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-canvas opacity-0 transition-opacity duration-500 ease-out group-data-blurred:opacity-40"
      />
    </div>
  );
}
