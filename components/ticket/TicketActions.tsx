import { SaveTicketButton } from "./SaveTicketButton";

type TicketActionsProps = {
  token: string;
  ticketNumber: string;
  ticketUrl: string;
  eventName: string;
  /** A spent ticket can still be shared, but there is no point saving its QR. */
  qrIsLive: boolean;
};

/**
 * The action block under the ticket details — docs/05-UX-FLOWS.md section 4.3.
 * Save is the primary action and sits first; the share actions from step B7
 * follow it.
 */
export function TicketActions({ token, ticketNumber, ticketUrl, eventName, qrIsLive }: TicketActionsProps) {
  return (
    <section aria-label="Aksi tiket" className="flex flex-col gap-3">
      {qrIsLive && (
        <SaveTicketButton
          token={token}
          ticketNumber={ticketNumber}
          ticketUrl={ticketUrl}
          eventName={eventName}
        />
      )}
    </section>
  );
}
