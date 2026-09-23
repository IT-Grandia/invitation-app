import Image from "next/image";
import { VenueMark } from "@/components/ui/VenueMark";
import { BRAND } from "@/lib/brand";
import type { EventDetail } from "@/lib/validation/event-content";
import { CoverAction, type CoverActionProps } from "./CoverAction";
import { CoverBackdrop } from "./CoverBackdrop";
import { EventNotes } from "./EventNotes";

/**
 * The cover — the whole of `/` — as DESIGN.md section 5.1 lays it out, in two
 * layers. Behind: the striped wall and the organiser's flyer, pinned for the
 * whole page. In front: a first screen that holds nothing but the hint to
 * scroll, then the "When & where" card and the supporters' card, which rise
 * over the flyer and blur it.
 *
 * The flyer carries the event's title and the presenter line, so the page has
 * no BrandHeader and its h1 is for screen readers only. The date, time and
 * venue come from the database: the flyer does not print them.
 */

// Both cards are the same card, colour included.
const CARD =
  "mx-auto w-full max-w-[26.25rem] rounded-card border border-line bg-surface px-5 py-8 text-center shadow-card sm:px-8 md:max-w-[30rem] md:px-10";

type CoverProps = {
  eventName: string;
  /** `Saturday, 26 September 2026` */
  dateLabel: string;
  /** `16:00–20:00 WIB` */
  timeLabel: string;
  venueName: string;
  venueMapUrl: string | null;
  /** The committee's important notes, from events.details. */
  notes: EventDetail[];
  action: CoverActionProps;
};

export function Cover({
  eventName,
  dateLabel,
  timeLabel,
  venueName,
  venueMapUrl,
  notes,
  action,
}: CoverProps) {
  const { sponsors } = BRAND;

  return (
    <main className="relative flex flex-1 flex-col">
      <h1 className="sr-only">{eventName}</h1>

      <CoverBackdrop revealId="details" />

      {/* Exactly one screen tall, so no card peeks in when the page opens. */}
      <div className="relative flex h-svh flex-col items-center justify-end pb-3 sm:pb-5">
        <a
          href="#details"
          className="flex min-h-tap flex-col items-center gap-1 px-4 py-1 font-sans text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase md:text-sm"
        >
          Event details
          <ChevronDown className="h-6 w-6 animate-nudge text-primary md:h-7 md:w-7" />
        </a>
      </div>

      <section
        id="details"
        aria-labelledby="details-title"
        className="relative z-10 scroll-mt-6 px-4"
      >
        <div className={CARD}>
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

          <EventNotes details={notes} className="mt-6" />

          <div className="mt-8">
            <CoverAction {...action} />
          </div>
        </div>
      </section>

      <section aria-labelledby="sponsors-title" className="relative z-10 mt-6 px-4 pb-12">
        <div className={`${CARD} flex flex-col items-center gap-4`}>
          {/* As the flyer sets "Community Partners": regular weight, letter-spaced. */}
          <h2
            id="sponsors-title"
            className="font-sans text-sm font-normal tracking-[0.12em] text-ink md:text-base"
          >
            Supported by
          </h2>
          <Image
            src={sponsors.src}
            alt={sponsors.alt}
            width={sponsors.width}
            height={sponsors.height}
            sizes="(max-width: 480px) calc(100vw - 4.5rem), 416px"
            className="h-auto w-full"
          />
        </div>
      </section>
    </main>
  );
}

/** Lucide `chevron-down`, drawn heavier than the default so it reads at a glance. */
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
