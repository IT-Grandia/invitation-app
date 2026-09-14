import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckedIn } from "@/components/ticket/CheckedIn";
import { LiveStatus } from "@/components/ticket/LiveStatus";
import { QrCard } from "@/components/ticket/QrCard";
import { TicketActions } from "@/components/ticket/TicketActions";
import { TicketDetails } from "@/components/ticket/TicketDetails";
import { TicketNotice } from "@/components/ticket/TicketNotice";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { getPublishedEvent } from "@/lib/db/queries/event";
import { findRegistrationByToken } from "@/lib/db/queries/registrations";
import { pollingWindow } from "@/lib/live-status";
import { isWellFormedToken, ticketUrl } from "@/lib/qr";
import { resolveTicketStatus } from "@/lib/ticket-status";
import { ticketNumber } from "@/lib/token";

// This page carries a participant's name. It must never be served from a CDN
// cache to anyone but the holder of the URL, and its check-in status has to be
// current — docs/team/DEV-B.md rule B-3, docs/06-SECURITY.md A8.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Deliberately generic: the participant's name stays out of the browser
  // title, tab history, and any link preview.
  title: "Your ticket",
  robots: { index: false, follow: false },
};

/**
 * One page for two moments — DESIGN.md section 6.3: the confirmation right
 * after registering (the form redirects here) and the ticket opened again at
 * the desk. After the scan it becomes the "Checked In" screen of section 6.4,
 * on its own if the page is open at the time (LiveStatus), otherwise the next
 * time it is opened.
 *
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
  const number = ticketNumber(registration.token);

  return (
    <main className="paper-stripes flex flex-1 flex-col items-center px-4 py-3 sm:py-10">
      <article className="flex w-full max-w-[26.25rem] flex-col gap-6 rounded-card border-[3px] border-double border-line bg-surface px-5 py-6 text-center shadow-card sm:px-8 sm:py-8">
        <BrandHeader />

        {status.kind === "registered" && (
          <>
            <div>
              <h1 className="font-display text-2xl text-primary italic">
                Thank you for your registration
              </h1>
              <p className="mt-2 text-ink-muted">
                <span className="font-semibold text-ink">{registration.fullName}</span>
                {" · "}
                Ticket No. <span className="font-mono font-bold tabular-nums">{number}</span>
              </p>
            </div>

            <QrCard token={registration.token} ticketNumber={number} presentation="live" />

            <TicketDetails event={event} />

            <p className="text-sm text-ink-muted text-pretty">
              Please save your QR code and show it at the registration desk on the event day.
            </p>

            <TicketActions
              token={registration.token}
              ticketNumber={number}
              ticketUrl={ticketUrl(registration.token)}
              fullName={registration.fullName}
              eventName={event.name}
            />

            <LiveStatus
              token={registration.token}
              windowStart={pollingWindow(event).start.toISOString()}
              windowEnd={pollingWindow(event).end.toISOString()}
            />
          </>
        )}

        {status.kind === "checked_in" && (
          <CheckedIn
            token={registration.token}
            ticketNumber={number}
            fullName={registration.fullName}
            community={registration.community}
            checkedInAt={status.at}
          />
        )}

        {(status.kind === "waitlist" ||
          status.kind === "cancelled" ||
          status.kind === "not_attending") && (
          <>
            <TicketNotice kind={status.kind} contactWhatsapp={event.contactWhatsapp} />
            <TicketDetails event={event} />
          </>
        )}
      </article>
    </main>
  );
}
