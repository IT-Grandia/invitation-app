import { CopyLinkButton } from "./CopyLinkButton";
import { SaveTicketButton } from "./SaveTicketButton";

type TicketActionsProps = {
  token: string;
  ticketNumber: string;
  ticketUrl: string;
  fullName: string;
  eventName: string;
  /** e.g. "Sabtu, 26 Sep 2026 · 08:00 WIB · Padel Arena Jakarta" */
  whenWhere: string;
  venueMapUrl: string | null;
  /** A spent ticket can still be shared, but there is no point saving its QR. */
  qrIsLive: boolean;
};

/**
 * The action block under the ticket details — docs/05-UX-FLOWS.md section 4.3.
 * Save first as the primary action, WhatsApp second, then the three lighter
 * actions in a row.
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
  whenWhere,
  venueMapUrl,
  qrIsLive,
}: TicketActionsProps) {
  // Copy from docs/05-UX-FLOWS.md section 4.3, verbatim.
  const whatsappText = [
    `Tiket ${eventName} — ${fullName} (${ticketNumber})`,
    whenWhere,
    "",
    `Buka tiket: ${ticketUrl}`,
    "",
    "Simpan pesan ini ya, ini tiket masuk kamu.",
  ].join("\n");

  const secondary =
    "min-h-tap flex flex-1 items-center justify-center gap-1.5 rounded-pill border border-line-input px-3 text-sm font-semibold";

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

      <a
        href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-h-tap flex items-center justify-center gap-2 rounded-pill bg-surface-2 px-6 font-bold"
      >
        <span aria-hidden="true">💬</span>
        Kirim link ke WhatsApp
      </a>

      <div className="flex gap-2">
        <CopyLinkButton ticketUrl={ticketUrl} />

        <a href="/api/calendar" className={secondary}>
          <span aria-hidden="true">📅</span>
          Kalender
        </a>

        {venueMapUrl && (
          <a href={venueMapUrl} target="_blank" rel="noopener noreferrer" className={secondary}>
            <span aria-hidden="true">📍</span>
            Maps
          </a>
        )}
      </div>
    </section>
  );
}
