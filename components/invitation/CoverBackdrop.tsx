"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

/**
 * The layer behind the cover — DESIGN.md section 5.1: the striped wall, the
 * presenters' logos, the flyer, and the community partners, pinned while the
 * page scrolls. The logos and the partners used to be printed on the flyer
 * itself; the organiser now supplies them as their own files, so they are set
 * around it here.
 *
 * Once the card named by `revealId` has risen past the lower fifth of the
 * screen, the whole layer blurs and fades back so the eye moves to the card,
 * and it sharpens again when the visitor scrolls back up. Blurring the stripes
 * with the artwork keeps the flyer's edge from standing out against a sharp
 * background.
 *
 * The blur is switched, not scrubbed: a filter recomputed on every scroll
 * frame stutters on a cheap phone, a single transition does not. Without
 * JavaScript the layer simply stays sharp.
 */

type CoverBackdropProps = {
  revealId: string;
};

const CAPTION = "font-sans text-sm font-normal tracking-[0.12em] text-ink";

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

  const { presenters, flyer, communities } = BRAND;

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
            and the artwork would jump in size. */}
        <div className="flex h-svh flex-col items-center justify-center gap-5 px-4 pt-4 pb-24 sm:gap-7 sm:px-6 sm:pt-8 sm:pb-28">
          <Image
            src={presenters.src}
            alt={presenters.alt}
            width={presenters.width}
            height={presenters.height}
            priority
            sizes="(max-width: 639px) 84vw, 420px"
            quality={60}
            className="hidden h-auto w-[84%] max-w-[26.25rem] [@media(min-height:600px)]:block"
          />

          {/* One file is fetched, not two: a second <Image> hidden with CSS
              would still be downloaded. The height caps keep the stack on the
              screen: on a short screen — a phone held sideways — the logos and
              the partners step aside and the flyer takes the room. */}
          <picture className="transition-[scale] duration-500 ease-out motion-safe:group-data-blurred:scale-105">
            <source media="(min-width: 640px)" srcSet={flyer.wide.src} />
            <img
              src={flyer.square.src}
              alt={flyer.alt}
              width={flyer.square.width}
              height={flyer.square.height}
              fetchPriority="high"
              decoding="async"
              className="block h-auto max-h-[calc(100svh-8rem)] w-auto max-w-full rounded-card shadow-card sm:max-w-[34rem] lg:max-w-[42rem] [@media(min-height:600px)]:max-h-[calc(100svh-18rem)] sm:[@media(min-height:600px)]:max-h-[calc(100svh-20rem)]"
            />
          </picture>

          <div className="hidden flex-col items-center gap-3 [@media(min-height:600px)]:flex">
            <p className={CAPTION}>Community Partners</p>
            <div className="flex items-center gap-4">
              <Image
                src={communities.womenpreneur.src}
                alt={communities.womenpreneur.alt}
                width={communities.womenpreneur.width}
                height={communities.womenpreneur.height}
                sizes="120px"
                quality={60}
                className="h-11 w-auto md:h-12"
              />
              <span aria-hidden="true" className="h-9 w-px bg-line" />
              <Image
                src={communities.club79.src}
                alt={communities.club79.alt}
                width={communities.club79.width}
                height={communities.club79.height}
                sizes="120px"
                quality={60}
                className="h-4 w-auto md:h-5"
              />
            </div>
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
