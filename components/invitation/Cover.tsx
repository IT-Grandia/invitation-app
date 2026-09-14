import { BrandHeader } from "@/components/ui/BrandHeader";
import { PadelCourt } from "@/components/ui/PadelMarks";
import { BRAND } from "@/lib/brand";
import { CoverAction, type CoverActionProps } from "./CoverAction";
import { SupportedBy } from "./SupportedBy";

/**
 * The cover — the whole of `/` — as the organiser's mockup lays it out and
 * DESIGN.md section 6.1 specifies it: header, event name, tagline, flyer,
 * when and where, sponsors, one button. The button leads to the registration
 * form; there is no invitation body underneath any more.
 *
 * An ordinary scrolling page, not a fixed overlay: on a 360×740 phone every
 * element fits without scrolling, on a shorter one the page scrolls and the
 * button stays in the flow where a thumb expects it.
 *
 * The event name, date, time and venue come from the database; only the
 * brand lines (lib/brand.ts) are fixed.
 */

type CoverProps = {
  eventName: string;
  /** `Saturday, 26 September 2026` */
  dateLabel: string;
  /** `16:00–20:00 WIB` */
  timeLabel: string;
  venueName: string;
  action: CoverActionProps;
};

// Seven elements rise in turn — DESIGN.md section 11. Under
// prefers-reduced-motion the base layer collapses the durations and each
// element simply lands in place.
function rise(step: number) {
  return { animationDelay: `${step * 80}ms` };
}

export function Cover({ eventName, dateLabel, timeLabel, venueName, action }: CoverProps) {
  return (
    <main className="paper-stripes flex flex-1 flex-col items-center px-4 py-3 sm:py-10">
      {/* my-auto, not justify-center: auto margins centre the card on a tall
          screen but never push its top out of reach on a short one. */}
      <article className="my-auto w-full max-w-[26.25rem] rounded-card border-[3px] border-double border-line bg-surface px-5 py-6 text-center shadow-card sm:px-8 sm:py-8 md:max-w-[30rem] md:px-10 md:py-10">
        <div className="animate-rise" style={rise(0)}>
          <BrandHeader />
        </div>

        {/* Not text-hero: the name is a full sentence in capitals, and at hero
            size it would run to five lines on a 360px screen. */}
        <h1
          className="animate-rise mt-5 font-display text-2xl leading-tight font-semibold tracking-[0.04em] text-balance uppercase sm:text-3xl md:text-4xl"
          style={rise(1)}
        >
          {eventName}
        </h1>

        <p className="animate-rise mt-2 font-display text-lg text-ink-muted italic md:text-xl" style={rise(2)}>
          {BRAND.tagline}
        </p>

        <div className="animate-rise mt-5" style={rise(3)}>
          <FlyerPlaceholder />
        </div>

        <div className="animate-rise mt-5 flex flex-col gap-0.5" style={rise(4)}>
          <p className="font-display text-lg font-semibold md:text-xl">{dateLabel}</p>
          <p className="font-mono text-sm tabular-nums md:text-base">{timeLabel}</p>
          <p className="text-ink-muted md:text-lg">{venueName}</p>
        </div>

        <div className="animate-rise mt-5" style={rise(5)}>
          <SupportedBy />
        </div>

        <div className="animate-rise mt-6" style={rise(6)}>
          <CoverAction {...action} />
        </div>
      </article>
    </main>
  );
}

/**
 * Stands where the flyer will go, at the flyer's own 4:5 ratio, so the real
 * file drops in without moving anything (DESIGN.md section 4). Capped at
 * 32dvh tall so that, with a one-line event name, the button is still on
 * screen on a 360×740 phone; a longer name costs one short scroll. Never
 * narrower than 9rem, so a landscape phone still shows a frame rather than
 * a stamp. The court mark is the project's own drawing — nothing borrowed,
 * nothing generated.
 */
function FlyerPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex aspect-[4/5] w-[clamp(9rem,25.6dvh,100%)] items-center justify-center overflow-hidden rounded-md border-[3px] border-double border-line bg-surface-2 md:w-[clamp(9rem,27dvh,100%)]"
    >
      {/* 2:1 court turned upright: at 110% of the frame's width it stands
          1.1× the width tall, inside a frame 1.25× tall — whole, not cropped.
          A court cropped past its edges reads as stray lines, not a court. */}
      <PadelCourt className="w-[110%] shrink-0 rotate-90 text-line-input/70" />
    </div>
  );
}
