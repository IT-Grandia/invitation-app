import { SaveTicketButton } from "./SaveTicketButton";

type TicketActionsProps = {
  token: string;
  ticketNumber: string;
  ticketUrl: string;
  fullName: string;
  eventName: string;
};

/**
 * The two buttons under the ticket — DESIGN.md section 6.3: download the QR,
 * then send the link to WhatsApp.
 *
 * WhatsApp opens with the text filled in and no recipient: the participant
 * picks who gets it, usually their own chat. We do hold their number, but
 * pre-filling it would send the link from whatever WhatsApp account is on the
 * phone in hand — wrong on a borrowed device.
 */
export function TicketActions({
  token,
  ticketNumber,
  ticketUrl,
  fullName,
  eventName,
}: TicketActionsProps) {
  // Copy from DESIGN.md section 5, verbatim.
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
        href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-h-tap flex items-center justify-center rounded-pill border border-line-input px-6 font-display text-lg font-semibold tracking-[0.06em] text-ink md:min-h-14 md:text-xl"
      >
        Send Link to WhatsApp
      </a>
    </div>
  );
}
