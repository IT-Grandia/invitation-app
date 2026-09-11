import { formatWibDateLong, formatWibTime } from "@/lib/datetime";
import type { Event } from "@/lib/db/schema";

type TicketDetailsProps = {
  event: Pick<Event, "name" | "startsAt" | "endsAt" | "venueName" | "venueAddress">;
};

/** Event facts on the ticket — docs/05-UX-FLOWS.md section 4.3. */
export function TicketDetails({ event }: TicketDetailsProps) {
  const rows = [
    { icon: "📅", label: "Tanggal", value: formatWibDateLong(event.startsAt), detail: null },
    {
      icon: "🕐",
      label: "Jam",
      value: `${formatWibTime(event.startsAt)}–${formatWibTime(event.endsAt)} WIB`,
      detail: null,
    },
    {
      icon: "📍",
      label: "Lokasi",
      value: event.venueName,
      // The seed fills both with "TBA"; joining them reads as "TBA, TBA".
      // Only show an address that actually adds something.
      detail: event.venueAddress && event.venueAddress !== event.venueName ? event.venueAddress : null,
    },
  ];

  return (
    <section aria-labelledby="ticket-event-name" className="border-y border-line py-5">
      <h2 id="ticket-event-name" className="text-xl font-bold">
        {event.name}
      </h2>

      <dl className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3">
            <dt className="shrink-0">
              <span aria-hidden="true">{row.icon}</span>
              <span className="sr-only">{row.label}</span>
            </dt>
            <dd className="text-ink-muted text-pretty">
              {row.value}
              {row.detail && (
                <span className="block text-sm">{row.detail}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
