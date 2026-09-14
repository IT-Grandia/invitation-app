import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cache } from "react";
import { ContactFooter } from "@/components/invitation/ContactFooter";
import { CoverGate } from "@/components/invitation/CoverGate";
import { EventCta, type CtaState } from "@/components/invitation/EventCta";
import { EventDetails } from "@/components/invitation/EventDetails";
import { Greeting } from "@/components/invitation/Greeting";
import { Rundown } from "@/components/invitation/Rundown";
import { StoredTicketBanner } from "@/components/invitation/StoredTicketBanner";
import { TicketBanner } from "@/components/invitation/TicketBanner";
import { Venue } from "@/components/invitation/Venue";
import { formatWibDateLong } from "@/lib/datetime";
import { getEventStats, getPublishedEvent } from "@/lib/db/queries/event";
import { resolveRegistrationState } from "@/lib/event-state";
import { isWellFormedToken } from "@/lib/qr";
import { TICKET_COOKIE_NAME } from "@/lib/ticket-cookie";

// The page is already dynamic at runtime because it reads the ticket cookie.
// Declaring it here also keeps the build from prerendering the page, which would
// query the database and fail the deploy whenever that database is unreachable.
export const dynamic = "force-dynamic";

// generateMetadata and the page both need the event; React's cache dedupes
// the query within one request so the database is asked once.
const loadEvent = cache(getPublishedEvent);

/**
 * Where the call to action points.
 *
 * Currently the separate form page that docs/05-UX-FLOWS.md section 1
 * describes. If the team agrees to move the form into this page as a component,
 * this becomes "#rsvp" and nothing else changes — the CTA is a plain anchor
 * either way, so E2E scenario E1 keeps passing.
 */
const REGISTER_HREF = "/regist";

export async function generateMetadata(): Promise<Metadata> {
  const event = await loadEvent();
  if (!event) return {};

  const description = event.description ?? `Undangan dan pendaftaran ${event.name}.`;

  return {
    title: { absolute: event.name },
    description,
    openGraph: { title: event.name, description },
  };
}

export default async function InvitationPage() {
  const event = await loadEvent();

  // No published event means the committee has not opened anything yet — or
  // has archived it. Either way there is nothing to invite anyone to.
  if (!event) {
    return <NoEvent />;
  }

  const [stats, cookieStore] = await Promise.all([getEventStats(event.id), cookies()]);

  // Whether the visitor already holds a ticket decides three things: the cover
  // is skipped, the banner renders on the server (no content flash), and the
  // CTA points at their ticket instead of the form. The cookie is set by Dev A's
  // /api/register; anything that fails the token shape is treated as absent.
  const cookieToken = cookieStore.get(TICKET_COOKIE_NAME)?.value;
  const ticketToken = cookieToken && isWellFormedToken(cookieToken) ? cookieToken : undefined;

  const ctaState: CtaState = ticketToken
    ? { kind: "has_ticket", ticketHref: `/t/${ticketToken}` }
    : resolveRegistrationState(event, stats.registered);

  const dateLabel = formatWibDateLong(event.startsAt);

  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <CoverGate
        enabled={!ticketToken}
        eventName={event.name}
        dateLabel={dateLabel}
        venueName={event.venueName}
      >
        {/* Cookie found: banner is in the server HTML. Otherwise the client
            checks localStorage after hydration — docs/05-UX-FLOWS.md section 3. */}
        {ticketToken ? <TicketBanner ticketHref={`/t/${ticketToken}`} /> : <StoredTicketBanner />}

        <main className="flex flex-1 flex-col">
          <Greeting dateLabel={dateLabel} />

          <div className="mt-8">
            <EventCta state={ctaState} registerHref={REGISTER_HREF} />
          </div>

          <EventDetails items={event.details} />
          <Rundown entries={event.rundown} />
          <Venue name={event.venueName} address={event.venueAddress} mapUrl={event.venueMapUrl} />
        </main>

        <ContactFooter whatsapp={event.contactWhatsapp} eventName={event.name} />
      </CoverGate>
    </div>
  );
}

function NoEvent() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">Belum ada acara yang dibuka</h1>
      <p className="text-ink-muted text-pretty">Cek lagi nanti ya. Undangannya akan muncul di sini.</p>
    </main>
  );
}
