import { cookies } from "next/headers";
import { ContactFooter } from "@/components/invitation/ContactFooter";
import { Countdown } from "@/components/invitation/Countdown";
import { CoverGate } from "@/components/invitation/CoverGate";
import { EventCta, type CtaState } from "@/components/invitation/EventCta";
import { EventDetails } from "@/components/invitation/EventDetails";
import { Faq } from "@/components/invitation/Faq";
import { Greeting } from "@/components/invitation/Greeting";
import { Rundown } from "@/components/invitation/Rundown";
import { Venue } from "@/components/invitation/Venue";
import { isThemeId } from "@/lib/theme";

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
  startsAt: "2026-09-26T01:00:00.000Z", // 08:00 WIB
  dateLabel: "Sabtu, 26 September 2026",
  startsAtLabel: "Sabtu, 26 September 2026 pukul 08.00 WIB",

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

  faq: [
    {
      question: "Aku belum pernah main padel, boleh ikut?",
      answer:
        "Boleh banget. Acaranya memang dibuat santai, dan bakal ada yang bantu jelaskan aturan mainnya di awal.",
    },
    {
      question: "Harus bawa raket sendiri?",
      answer:
        "Nggak harus. Ada raket pinjaman di lokasi. Kalau kamu punya sendiri, bawa saja biar lebih nyaman.",
    },
    {
      question: "Bisa daftar sekalian buat teman?",
      answer:
        "Satu pendaftaran untuk satu orang, karena tiap orang dapat QR sendiri buat masuk. Minta temanmu daftar pakai link yang sama ya.",
    },
    {
      question: "Kalau hujan gimana?",
      answer:
        "Panitia akan kabari lewat WhatsApp ke nomor yang kamu daftarkan. Makanya pastikan nomornya benar waktu mengisi form.",
    },
    {
      question: "Tiketku hilang, gimana?",
      answer:
        "Coba buka lagi website ini dari HP yang sama, biasanya tiketmu langsung muncul. Kalau tetap tidak ketemu, hubungi panitia lewat tombol di bawah.",
    },
  ],
} as const;

const TICKET_COOKIE = "padel_ticket";

/**
 * Where the call to action points.
 *
 * Currently the separate form page that docs/05-UX-FLOWS.md section 1
 * describes. If the team agrees to move the form into this page as a component,
 * this becomes "#rsvp" and nothing else changes — the CTA is a plain anchor
 * either way, so E2E scenario E1 keeps passing.
 */
const REGISTER_HREF = "/daftar";

export default async function InvitationPage({ searchParams }: PageProps<"/">) {
  // A review aid, not a user-facing feature: ?theme=court-night or
  // ?theme=sunday-rally previews either palette without waiting for the clock.
  // <html> keeps the time-based theme; this only overrides the page subtree.
  const { theme } = await searchParams;
  const themeOverride = isThemeId(theme) ? theme : undefined;

  // Whether the visitor already holds a ticket decides two things: the cover is
  // skipped, and the CTA points at their ticket instead of the form. The sticky
  // banner itself lands in step B8.
  const ticketToken = (await cookies()).get(TICKET_COOKIE)?.value;

  const ctaState: CtaState = ticketToken
    ? { kind: "has_ticket", ticketHref: `/t/${ticketToken}` }
    : { kind: "open", remaining: PLACEHOLDER_EVENT.remainingSeats };

  // Captured once, before render, so the countdown's first paint is identical
  // on the server and in the browser.
  const serverNowIso = new Date().toISOString();

  return (
    <div data-theme={themeOverride} className="flex flex-1 flex-col bg-canvas text-ink">
      <CoverGate
        enabled={!ticketToken}
        eventName={PLACEHOLDER_EVENT.name}
        dateLabel={PLACEHOLDER_EVENT.dateLabel}
        venueName={PLACEHOLDER_EVENT.venueName}
      >
        <main className="flex flex-1 flex-col">
          <Greeting dateLabel={PLACEHOLDER_EVENT.dateLabel} />

          <div className="mt-9 px-6">
            <Countdown
              targetIso={PLACEHOLDER_EVENT.startsAt}
              serverNowIso={serverNowIso}
              startsAtLabel={PLACEHOLDER_EVENT.startsAtLabel}
            />
          </div>

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
          <Faq entries={PLACEHOLDER_EVENT.faq} />
        </main>

        <ContactFooter
          whatsapp={PLACEHOLDER_EVENT.contactWhatsapp}
          eventName={PLACEHOLDER_EVENT.name}
        />
      </CoverGate>
    </div>
  );
}
