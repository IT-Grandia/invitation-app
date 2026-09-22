import Image from "next/image";
import { VenueMark } from "@/components/ui/VenueMark";
import { BRAND } from "@/lib/brand";
import { CoverAction, type CoverActionProps } from "./CoverAction";

/**
 * The cover — the whole of `/` — in the order DESIGN.md section 5.1 sets:
 * the organiser's flyer, then when and where with the one button, then the
 * sponsors. Each part is reached by scrolling; nothing is fixed or snapped.
 *
 * The flyer carries the event's title and the presenter line, so the page has
 * no BrandHeader and its h1 is for screen readers only. The date, time and
 * venue come from the database: the flyer does not print them.
 */

// As the flyer sets "Community Partners": regular weight, letter-spaced.
const SPONSOR_CAPTION = "font-sans text-sm font-normal tracking-[0.12em] text-ink md:text-base";

type CoverProps = {
  eventName: string;
  /** `Saturday, 26 September 2026` */
  dateLabel: string;
  /** `16:00–20:00 WIB` */
  timeLabel: string;
  venueName: string;
  venueMapUrl: string | null;
  action: CoverActionProps;
};

export function Cover({
  eventName,
  dateLabel,
  timeLabel,
  venueName,
  venueMapUrl,
  action,
}: CoverProps) {
  const { flyer, sponsors } = BRAND;

  return (
    <main className="paper-stripes flex flex-1 flex-col items-center pb-12">
      <h1 className="sr-only">{eventName}</h1>

      {/* Edge to edge on a phone: the flyer's own background matches the
          canvas, so it needs no frame until there is room around it. */}
      <figure className="w-full sm:mt-10 sm:max-w-[30rem] sm:overflow-hidden sm:rounded-card sm:shadow-card">
        <Image
          src={flyer.src}
          alt={flyer.alt}
          width={flyer.width}
          height={flyer.height}
          priority
          sizes="(max-width: 639px) 100vw, 480px"
          className="block h-auto w-full"
        />
      </figure>

      {/* On a phone the flyer fills most of the first screen and the button
          sits below it; this is the hint that there is more. */}
      <a
        href="#details"
        className="mt-2 inline-flex min-h-tap items-center gap-2 px-4 font-sans text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase md:text-sm"
      >
        Event details <span aria-hidden="true">↓</span>
      </a>

      <section
        id="details"
        aria-labelledby="details-title"
        className="w-full scroll-mt-4 px-4 pt-6 sm:pt-10"
      >
        <div className="mx-auto w-full max-w-[26.25rem] rounded-card border border-line bg-surface px-5 py-8 text-center shadow-card sm:px-8 md:max-w-[30rem] md:px-10">
          <h2
            id="details-title"
            className="font-sans text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase md:text-sm"
          >
            When &amp; where
          </h2>

          <div className="mt-4 flex flex-col items-center gap-1">
            <p className="font-display text-xl font-bold text-balance text-primary md:text-2xl">
              {dateLabel}
            </p>
            <p className="font-sans text-base tabular-nums md:text-lg">{timeLabel}</p>
            <VenueMark venueName={venueName} mapUrl={venueMapUrl} className="mt-2" />
          </div>

          <div className="mt-8">
            <CoverAction {...action} />
          </div>
        </div>
      </section>

      {/* White, not canvas: the sponsor board was drawn on white, and two of
          its logos sit on white boxes of their own. */}
      <section aria-label="Sponsors and community partners" className="mt-12 w-full px-4">
        <div className="mx-auto flex w-full max-w-[26.25rem] flex-col items-center gap-10 rounded-card border border-line bg-white px-5 py-8 text-center shadow-card md:max-w-[30rem] md:px-8">
          <div className="flex w-full flex-col items-center gap-4">
            <h2 className={SPONSOR_CAPTION}>Supported by</h2>
            <Image
              src={sponsors.supported.src}
              alt={sponsors.supported.alt}
              width={sponsors.supported.width}
              height={sponsors.supported.height}
              sizes="(max-width: 480px) calc(100vw - 4.5rem), 416px"
              className="h-auto w-full"
            />
          </div>
          <div className="flex w-full flex-col items-center gap-4">
            <h2 className={SPONSOR_CAPTION}>Community Partners</h2>
            <Image
              src={sponsors.community.src}
              alt={sponsors.community.alt}
              width={sponsors.community.width}
              height={sponsors.community.height}
              sizes="208px"
              className="h-auto w-1/2 max-w-52"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
