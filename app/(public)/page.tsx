import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cache } from "react";
import { Cover } from "@/components/invitation/Cover";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { formatWibDateLong, formatWibTime } from "@/lib/datetime";
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
 * Where "Open Invitation" leads: Dev A's registration form. The cover is the
 * whole of this page (DESIGN.md section 6.0) — there is no invitation body
 * between the two any more.
 */
const REGISTER_HREF = "/regist";

export async function generateMetadata(): Promise<Metadata> {
  const event = await loadEvent();
  if (!event) return {};

  const description = `Your invitation to ${event.name}. Register once and your QR ticket is ready right away.`;

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

  // A visitor who already holds a ticket gets "View Your Ticket" instead of
  // the form. The cookie is set by Dev A's /api/register; anything that fails
  // the token shape is treated as absent. The localStorage layer is checked
  // on the client, inside CoverAction.
  const cookieToken = cookieStore.get(TICKET_COOKIE_NAME)?.value;
  const serverTicketToken =
    cookieToken && isWellFormedToken(cookieToken) ? cookieToken : undefined;

  return (
    <Cover
      eventName={event.name}
      dateLabel={formatWibDateLong(event.startsAt, "en")}
      timeLabel={`${formatWibTime(event.startsAt)}–${formatWibTime(event.endsAt)} WIB`}
      venueName={event.venueName}
      venueMapUrl={event.venueMapUrl}
      action={{
        state: resolveRegistrationState(event, stats.registered),
        serverTicketToken,
        registerHref: REGISTER_HREF,
        contactWhatsapp: event.contactWhatsapp,
      }}
    />
  );
}

function NoEvent() {
  return (
    <main className="paper-stripes flex flex-1 flex-col items-center px-4 py-6 sm:py-10">
      <div className="my-auto w-full max-w-[26.25rem] rounded-card border border-line bg-surface px-6 py-8 text-center shadow-card md:max-w-[30rem] md:px-10">
        <BrandHeader />
        <h1 className="mt-7 font-display text-2xl font-bold text-balance text-primary md:text-3xl">
          No event is open right now
        </h1>
        <p className="mt-3 text-ink-muted text-pretty">
          Check back soon — the invitation will appear here.
        </p>
      </div>
    </main>
  );
}
