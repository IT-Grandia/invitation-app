import { SaveTicketButton } from "./SaveTicketButton";

type TicketActionsProps = {
  token: string;
  ticketNumber: string;
  ticketUrl: string;
  fullName: string;
  /** The WhatsApp number given on the form, stored as digits (628…). */
  phone: string;
  eventName: string;
};

/**
 * The two buttons under the ticket — DESIGN.md section 5.3: download the QR,
 * then send the link to WhatsApp.
 *
 * WhatsApp opens on the participant's own number — the one they registered
 * with — with the message filled in, so all that is left is to tap send. On
 * their own phone that is the "message yourself" chat, which keeps the link
 * where they will look for it on the day; on a borrowed phone the message
 * goes from the friend's WhatsApp to the participant's number, which still
 * lands the link on the right phone.
 */
export function TicketActions({
  token,
  ticketNumber,
  ticketUrl,
  fullName,
  phone,
  eventName,
}: TicketActionsProps) {
  // Copy from DESIGN.md section 9, verbatim.
  const whatsappText = [
    `${eventName} — ${fullName} (${ticketNumber})`,
    `Open your ticket: ${ticketUrl}`,
    "Please keep this message, it is your entry ticket.",
  ].join("\n");

  return (
    <div className="flex flex-col gap-3">
      <SaveTicketButton
        token={token}
        ticketNumber={ticketNumber}
        ticketUrl={ticketUrl}
        eventName={eventName}
      />

      <a
        href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-h-tap flex items-center justify-center rounded-pill border border-line-input px-6 font-sans text-base font-semibold py-2 text-center leading-tight tracking-[0.1em] text-balance uppercase text-ink md:min-h-14 md:text-lg"
      >
        Send Link to WhatsApp
      </a>
    </div>
  );
}
