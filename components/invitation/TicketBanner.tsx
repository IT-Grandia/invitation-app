import Link from "next/link";

/**
 * "Kamu sudah terdaftar" — docs/05-UX-FLOWS.md section 3.
 *
 * Presentational only, so it can be rendered on the server (cookie found) or
 * after hydration (localStorage found) with identical markup. Sticky so it
 * stays reachable while the invitation scrolls underneath.
 */
export function TicketBanner({ ticketHref }: { ticketHref: string }) {
  return (
    <div className="sticky top-0 z-20 bg-success text-white shadow-card">
      <Link
        href={ticketHref}
        className="mx-auto flex min-h-tap w-full max-w-2xl items-center justify-between gap-3 px-5 font-semibold"
      >
        <span>Kamu sudah terdaftar</span>
        <span className="shrink-0">
          Lihat tiket saya <span aria-hidden="true">→</span>
        </span>
      </Link>
    </div>
  );
}
