import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { formatPhoneForDisplay } from "@/lib/phone";

/**
 * The ticket when there is no QR to show — DESIGN.md section 5.3: on the
 * waiting list, cancelled, or the participant said they are not attending.
 * A headline, one sentence, and — where the next step is a conversation —
 * the organiser's WhatsApp as a row the participant can tap: the mark on
 * the left, the number on the right. Copy from section 9, verbatim.
 */

type NoticeKind = "waitlist" | "cancelled" | "not_attending";

type TicketNoticeProps = {
  kind: NoticeKind;
  contactWhatsapp: string | null;
};

const COPY: Record<
  NoticeKind,
  { headline: string; body: string; contact: boolean; className: string }
> = {
  waitlist: {
    headline: "You are on the waiting list",
    body: "We will message you on WhatsApp if a spot opens up.",
    contact: false,
    className: "bg-accent text-on-accent",
  },
  cancelled: {
    headline: "This registration has been cancelled",
    body: "Contact the organiser on WhatsApp if this is a mistake.",
    contact: true,
    className: "bg-danger text-white",
  },
  not_attending: {
    headline: "You have not confirmed your attendance",
    body: "Contact the organiser on WhatsApp to change your answer.",
    contact: true,
    className: "bg-surface-2 text-ink",
  },
};

export function TicketNotice({ kind, contactWhatsapp }: TicketNoticeProps) {
  const copy = COPY[kind];

  // The row needs a number. Without one the sentence must not promise a
  // WhatsApp chat it cannot offer — the committee fills events.contact_whatsapp.
  const number = copy.contact ? contactWhatsapp?.replace(/\D/g, "") || null : null;
  const body = number ? copy.body : copy.body.replace(" on WhatsApp", "");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className={`rounded-card px-5 py-4 font-display text-xl font-semibold text-balance ${copy.className}`}>
        {copy.headline}
      </h1>
      <p className="text-ink-muted text-pretty">{body}</p>
      {number && <WhatsAppContact number={number} />}
    </div>
  );
}

/**
 * `events.contact_whatsapp` as one tappable row. The stored number is E.164
 * without the plus (628…); wa.me takes it as is, and the participant sees it
 * in the local form they recognise (0812-3456-789).
 */
function WhatsAppContact({ number }: { number: string }) {
  const shown = formatPhoneForDisplay(number);

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat the organiser on WhatsApp, ${shown}`}
      className="inline-flex min-h-tap items-center gap-3 rounded-pill border border-line-input px-5 text-ink md:min-h-14"
    >
      <WhatsAppIcon className="h-6 w-6 shrink-0 text-primary md:h-7 md:w-7" />
      <span className="font-mono text-base font-bold tabular-nums md:text-lg">{shown}</span>
    </a>
  );
}
