"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const EXIT_MS = 420;

type CoverGateProps = {
  /**
   * False for a visitor who already holds a ticket. They get the invitation
   * straight away — at the gate on event morning, in a queue on a bad signal,
   * nobody wants to sit through an animation to reach their own QR code.
   */
  enabled: boolean;
  eventName: string;
  dateLabel: string;
  venueName: string;
  children: ReactNode;
};

export function CoverGate({
  enabled,
  eventName,
  dateLabel,
  venueName,
  children,
}: CoverGateProps) {
  const [phase, setPhase] = useState<"open" | "closing" | "closed">(
    enabled ? "open" : "closed",
  );
  const contentRef = useRef<HTMLDivElement>(null);

  const isCovered = phase !== "closed";

  // Applied after mount on purpose: with JavaScript disabled the cover is just
  // the first section of a normal page and the visitor scrolls straight past it.
  useEffect(() => {
    if (!isCovered) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCovered]);

  function openInvitation() {
    setPhase("closing");

    window.setTimeout(() => {
      setPhase("closed");
      // Hand focus to the invitation so keyboard and screen reader users
      // continue where everyone else is already looking.
      contentRef.current?.focus();
    }, EXIT_MS);
  }

  return (
    <>
      {isCovered && (
        <section
          aria-label="Cover undangan"
          data-phase={phase}
          className="hero-surface fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center transition-all duration-[420ms] ease-out data-[phase=closing]:-translate-y-6 data-[phase=closing]:opacity-0"
        >
          <div
            className="court-lines animate-sweep absolute inset-0"
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-center">
            <p
              className="animate-rise text-xs font-semibold tracking-[0.25em] text-ink-muted uppercase"
              style={{ animationDelay: "80ms" }}
            >
              kamu diundang main
            </p>

            <h1
              className="animate-rise mt-5 font-display text-hero font-extrabold text-balance"
              style={{ animationDelay: "200ms" }}
            >
              {eventName}
            </h1>

            <p
              className="animate-rise mt-5 text-lg text-ink-muted"
              style={{ animationDelay: "320ms" }}
            >
              {dateLabel}
              <br />
              {venueName}
            </p>

            <button
              type="button"
              onClick={openInvitation}
              className="animate-rise min-h-tap mt-10 rounded-pill bg-primary px-9 font-display text-lg font-bold text-on-primary shadow-card transition-transform active:scale-95"
              style={{ animationDelay: "460ms" }}
            >
              Masuk Lapangan
            </button>
          </div>
        </section>
      )}

      <div
        ref={contentRef}
        tabIndex={-1}
        inert={isCovered}
        className="flex flex-1 flex-col outline-none"
      >
        {children}
      </div>
    </>
  );
}
