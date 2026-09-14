/**
 * The ticket when there is no QR to show — DESIGN.md section 6.3: on the
 * waiting list, cancelled, or the participant said they are not attending.
 * A headline, one sentence, and the organiser's WhatsApp where the next step
 * is a conversation. Copy from section 5, verbatim.
 */

type NoticeKind = "waitlist" | "cancelled" | "not_attending";

type TicketNoticeProps = {
  kind: NoticeKind;
  contactWhatsapp: string | null;
};

const COPY: Record<
  NoticeKind,
  { headline: string; body: string; contact: string | null; className: string }
> = {
  waitlist: {
    headline: "You are on the waiting list",
    body: "We will message you on WhatsApp if a spot opens up.",
    contact: null,
    className: "bg-accent text-on-accent",
  },
  cancelled: {
    headline: "This registration has been cancelled",
    body: "Contact the organiser on WhatsApp if this is a mistake.",
    contact: "Contact the organiser",
    className: "bg-danger text-white",
  },
  not_attending: {
    headline: "You have not confirmed your attendance",
    body: "Contact the organiser on WhatsApp to change your answer.",
    contact: "Contact the organiser",
    className: "bg-surface-2 text-ink",
  },
};

export function TicketNotice({ kind, contactWhatsapp }: TicketNoticeProps) {
  const copy = COPY[kind];
  const whatsapp = contactWhatsapp?.replace(/\D/g, "");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className={`rounded-card px-5 py-4 font-display text-xl font-semibold text-balance ${copy.className}`}>
        {copy.headline}
      </h1>
      <p className="text-ink-muted text-pretty">{copy.body}</p>
      {copy.contact && whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-tap inline-flex items-center rounded-pill border border-line-input px-6 font-display text-lg font-semibold tracking-[0.06em]"
        >
          {copy.contact}
        </a>
      )}
    </div>
  );
}
