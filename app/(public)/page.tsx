import { cookies } from "next/headers";
import { ContactFooter } from "@/components/invitation/ContactFooter";
import { CoverGate } from "@/components/invitation/CoverGate";
import { EventCta, type CtaState } from "@/components/invitation/EventCta";
import { EventDetails } from "@/components/invitation/EventDetails";
import { Greeting } from "@/components/invitation/Greeting";
import { Rundown } from "@/components/invitation/Rundown";
import { StoredTicketBanner } from "@/components/invitation/StoredTicketBanner";
import { TicketBanner } from "@/components/invitation/TicketBanner";
import { Venue } from "@/components/invitation/Venue";
import { isWellFormedToken } from "@/lib/qr";
import { TICKET_COOKIE_NAME } from "@/lib/ticket-cookie";

/**
 * TEMPORARY placeholder event content.
 *
 * Every field here belongs in the database, not in code — docs/03-DATA-MODEL.md
 * section 2.1 is explicit that the committee must be able to change the name,
 * venue, times and rundown without a redeploy, and docs/01-PRD.md section 10.1
 * still lists all of them as unanswered. Kept in one object so the swap to
 * getPublishedEvent() costs a single line once Dev C merges M0.
 *
 * The wording below is a stand-in written from the defaults recorded in the
 * PRD. The committee has to review it before registration opens.
 */
const PLACEHOLDER_EVENT = {
  name: "Padel Day 2026",
  dateLabel: "Sabtu, 26 September 2026",

  venueName: "Padel Arena Jakarta",
  venueAddress: "Alamat lengkap menyusul dari panitia",
  venueMapUrl: "https://www.google.com/maps/search/?api=1&query=Padel+Arena+Jakarta",

  /** Null means the committee has not shared a number yet. */
  contactWhatsapp: null as string | null,

  /** Null means unlimited — docs/03-DATA-MODEL.md: no quota, no seat counter. */
  remainingSeats: null as number | null,

  details: [
    {
      label: "Format",
      value: "Main santai dengan rotasi pasangan. Bukan turnamen, tidak ada babak gugur.",
    },
    {
      label: "Level",
      value: "Terbuka untuk semua. Belum pernah main padel sama sekali juga boleh ikut.",
    },
    {
      label: "Bawa apa",
      value: "Sepatu non-marking, botol minum, dan handuk kecil. Raket ada pinjaman kalau kamu belum punya.",
    },
    {
      label: "Dress code",
      value: "Baju olahraga bebas. Yang penting nyaman buat gerak.",
    },
  ],

  rundown: [
    { time: "08.00", activity: "Registrasi ulang dan scan tiket" },
    { time: "08.30", activity: "Pemanasan bersama" },
    { time: "09.00", activity: "Sesi main dimulai" },
    { time: "12.00", activity: "Istirahat dan makan siang" },
    { time: "13.00", activity: "Sesi main lanjut" },
    { time: "16.30", activity: "Foto bersama" },
    { time: "17.00", activity: "Selesai" },
  ],

} as const;

/**
 * Where the call to action points.
 *
 * Currently the separate form page that docs/05-UX-FLOWS.md section 1
 * describes. If the team agrees to move the form into this page as a component,
 * this becomes "#rsvp" and nothing else changes — the CTA is a plain anchor
 * either way, so E2E scenario E1 keeps passing.
 */
const REGISTER_HREF = "/daftar";

export default async function InvitationPage() {
  // Whether the visitor already holds a ticket decides three things: the cover
  // is skipped, the banner renders on the server (no content flash), and the
  // CTA points at their ticket instead of the form. The cookie is set by Dev A's
  // /api/register; anything that fails the token shape is treated as absent.
  const cookieToken = (await cookies()).get(TICKET_COOKIE_NAME)?.value;
  const ticketToken = cookieToken && isWellFormedToken(cookieToken) ? cookieToken : undefined;

  const ctaState: CtaState = ticketToken
    ? { kind: "has_ticket", ticketHref: `/t/${ticketToken}` }
    : { kind: "open", remaining: PLACEHOLDER_EVENT.remainingSeats };

  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <CoverGate
        enabled={!ticketToken}
        eventName={PLACEHOLDER_EVENT.name}
        dateLabel={PLACEHOLDER_EVENT.dateLabel}
        venueName={PLACEHOLDER_EVENT.venueName}
      >
        {/* Cookie found: banner is in the server HTML. Otherwise the client
            checks localStorage after hydration — docs/05-UX-FLOWS.md section 3. */}
        {ticketToken ? <TicketBanner ticketHref={`/t/${ticketToken}`} /> : <StoredTicketBanner />}

        <main className="flex flex-1 flex-col">
          <Greeting dateLabel={PLACEHOLDER_EVENT.dateLabel} />

          <div className="mt-8">
            <EventCta state={ctaState} registerHref={REGISTER_HREF} />
          </div>

          <EventDetails items={PLACEHOLDER_EVENT.details} />
          <Rundown entries={PLACEHOLDER_EVENT.rundown} />
          <Venue
            name={PLACEHOLDER_EVENT.venueName}
            address={PLACEHOLDER_EVENT.venueAddress}
            mapUrl={PLACEHOLDER_EVENT.venueMapUrl}
          />
        </main>

        <ContactFooter
          whatsapp={PLACEHOLDER_EVENT.contactWhatsapp}
          eventName={PLACEHOLDER_EVENT.name}
        />
      </CoverGate>
    </div>
  );
}
