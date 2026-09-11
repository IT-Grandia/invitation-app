import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QrCard } from "@/components/ticket/QrCard";
import { StatusBadge } from "@/components/ticket/StatusBadge";
import { TicketDetails } from "@/components/ticket/TicketDetails";
import { getPublishedEvent } from "@/lib/db/queries/event";
import { findRegistrationByToken } from "@/lib/db/queries/registrations";
import { isWellFormedToken } from "@/lib/qr";
import { qrPresentation, resolveTicketStatus } from "@/lib/ticket-status";
import { ticketNumber } from "@/lib/token";

// This page carries a participant's name. It must never be served from a CDN
// cache to anyone but the holder of the URL, and its check-in status has to be
// current — docs/team/DEV-B.md rule B-3, docs/06-SECURITY.md A8.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Deliberately generic: the participant's name stays out of the browser
  // title, tab history, and any link preview.
  title: "Tiket kamu",
  robots: { index: false, follow: false },
};

const HIDDEN_QR_REASON = {
  cancelled: "Pendaftaran ini sudah dibatalkan. Kalau menurutmu ini keliru, hubungi panitia.",
  waitlist:
    "Kuota sedang penuh, jadi kamu masuk waiting list. Kalau ada yang batal, panitia menghubungi kamu lewat WhatsApp — QR baru muncul setelah itu.",
} as const;

/**
 * The ticket is chosen by the token in the URL and nothing else. This page
 * never reads the ticket cookie: if it did, someone opening a friend's link
 * would see their own ticket instead — docs/team/DEV-B.md rule B-4.
 */
export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Refuse malformed tokens before touching the database.
  if (!isWellFormedToken(token)) {
    notFound();
  }

  const registration = await findRegistrationByToken(token);
  if (!registration) {
    notFound();
  }

  // v1 runs a single published event. A ticket from any other event is treated
  // as unknown rather than rendered against the wrong event's details.
  const event = await getPublishedEvent();
  if (!event || event.id !== registration.eventId) {
    notFound();
  }

  const status = resolveTicketStatus(registration);
  const presentation = qrPresentation(status);
  const number = ticketNumber(registration.token);
  const hiddenReason =
    status.kind === "cancelled" || status.kind === "waitlist"
      ? HIDDEN_QR_REASON[status.kind]
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-6 py-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <StatusBadge status={status} />
        <div>
          <h1 className="text-2xl font-bold text-balance">{registration.fullName}</h1>
          <p className="mt-1 text-ink-muted">
            No. Tiket <span className="font-mono font-bold tabular-nums">{number}</span>
          </p>
        </div>
      </header>

      <QrCard
        token={registration.token}
        ticketNumber={number}
        presentation={presentation}
        hiddenReason={hiddenReason}
      />

      <TicketDetails event={event} />

      {presentation === "live" && (
        <p className="rounded-card border border-line bg-surface-2 px-4 py-3 text-center text-sm text-pretty">
          <span aria-hidden="true">⚠️ </span>
          Simpan tiket ini. Kamu butuh QR-nya saat masuk.
        </p>
      )}
    </main>
  );
}
