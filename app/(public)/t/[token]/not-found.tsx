import type { CSSProperties } from "react";
import Link from "next/link";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { PadelBall } from "@/components/ui/PadelMarks";

const backdropStripesStyle: CSSProperties = {
  backgroundColor: "#F5EFE1",
  backgroundImage: `repeating-linear-gradient(
    90deg,
    #F5EFE1 0px,
    #F5EFE1 var(--ticket-stripe-w, 32px),
    #E8E3D1 var(--ticket-stripe-w, 32px),
    #E8E3D1 calc(var(--ticket-stripe-w, 32px) * 2)
  )`,
  backgroundPosition: "center top",
};

/**
 * Rendered for any token that does not resolve — malformed, unknown, or from
 * another event. The wording never distinguishes between those cases, so the
 * page cannot be used to tell a real-but-mistyped token from a made-up one.
 * Copy per DESIGN.md section 5: no jargon, always an exit.
 */
export default function TicketNotFound() {
  return (
    <>
      <style>{`
        .ticket-backdrop {
          --ticket-stripe-w: 28px;
        }
        @media (min-width: 640px) {
          .ticket-backdrop {
            --ticket-stripe-w: 32px;
          }
        }
      `}</style>
      <main
        className="ticket-backdrop flex flex-1 flex-col items-center px-4 py-3 sm:py-10 min-h-screen text-ink antialiased"
        style={backdropStripesStyle}
      >
      <div className="my-auto flex w-full max-w-[26.25rem] flex-col items-center gap-6 rounded-card border border-line bg-surface px-5 py-6 text-center shadow-card sm:px-8 sm:py-8 md:max-w-[30rem] md:px-10 md:py-10">
        <BrandHeader className="w-full" />

        <PadelBall className="h-14 w-14 text-primary" />

        <div>
          <h1 className="font-display text-2xl font-bold text-balance text-primary md:text-3xl">Ticket not found</h1>
          <p className="mt-3 text-ink-muted text-pretty">
            The link may not have copied completely. Open it again from your WhatsApp chat —
            or, if you have not registered yet, register below.
          </p>
        </div>

        <Link
          href="/regist"
          className="min-h-tap flex w-full items-center justify-center rounded-pill bg-primary px-8 font-sans text-base font-semibold py-2 text-center leading-tight tracking-[0.1em] text-balance uppercase text-on-primary shadow-card md:min-h-14 md:text-lg"
        >
          Register
        </Link>

        <p className="text-sm text-ink-muted text-pretty">
          Registered but the ticket still cannot be found? Contact the organiser.
        </p>
      </div>
    </main>
    </>
  );
}
