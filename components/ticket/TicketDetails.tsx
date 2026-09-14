import { formatWibDateLong, formatWibTime } from "@/lib/datetime";
import type { Event } from "@/lib/db/schema";

type TicketDetailsProps = {
  event: Pick<Event, "startsAt" | "endsAt" | "venueName" | "venueMapUrl">;
};

/**
 * When and where, in the same three lines as the cover — DESIGN.md section
 * 6.3. The venue is a link to the map when the committee has supplied one:
 * on the day, that is the one thing a participant opens the ticket for
 * besides the QR.
 */
export function TicketDetails({ event }: TicketDetailsProps) {
  return (
    <div className="flex flex-col gap-0.5 text-center">
      <p className="font-display text-lg font-semibold md:text-xl">{formatWibDateLong(event.startsAt, "en")}</p>
      <p className="font-mono text-sm tabular-nums md:text-base">
        {formatWibTime(event.startsAt)}–{formatWibTime(event.endsAt)} WIB
      </p>
      {event.venueMapUrl ? (
        <a
          href={event.venueMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-muted underline decoration-line underline-offset-4 hover:text-ink md:text-lg"
        >
          {event.venueName}
        </a>
      ) : (
        <p className="text-ink-muted md:text-lg">{event.venueName}</p>
      )}
    </div>
  );
}
