import Link from "next/link";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { PadelBall } from "@/components/ui/PadelMarks";

/**
 * Rendered for any token that does not resolve — malformed, unknown, or from
 * another event. The wording never distinguishes between those cases, so the
 * page cannot be used to tell a real-but-mistyped token from a made-up one.
 * Copy per DESIGN.md section 5: no jargon, always an exit.
 */
export default function TicketNotFound() {
  return (
    <main className="paper-stripes flex flex-1 flex-col items-center px-4 py-3 sm:py-10">
      <div className="my-auto flex w-full max-w-[26.25rem] flex-col items-center gap-6 rounded-card border-[3px] border-double border-line bg-surface px-5 py-6 text-center shadow-card sm:px-8 sm:py-8 md:max-w-[30rem] md:px-10 md:py-10">
        <BrandHeader className="w-full" />

        <PadelBall className="h-14 w-14 text-primary" />

        <div>
          <h1 className="font-display text-2xl font-semibold">Ticket not found</h1>
          <p className="mt-3 text-ink-muted text-pretty">
            The link may not have copied completely. Open it again from your WhatsApp chat —
            or, if you have not registered yet, register below.
          </p>
        </div>

        <Link
          href="/regist"
          className="min-h-tap flex w-full items-center justify-center rounded-pill bg-primary px-8 font-display text-lg font-semibold tracking-[0.06em] text-on-primary shadow-card"
        >
          Register
        </Link>

        <p className="text-sm text-ink-muted text-pretty">
          Registered but the ticket still cannot be found? Contact the organiser.
        </p>
      </div>
    </main>
  );
}
