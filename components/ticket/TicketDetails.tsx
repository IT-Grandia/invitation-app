import { VenueMark } from "@/components/ui/VenueMark";
import { formatWibDateLong, formatWibTime } from "@/lib/datetime";
import type { Event } from "@/lib/db/schema";

type TicketDetailsProps = {
  event: Pick<Event, "startsAt" | "endsAt" | "venueName" | "venueMapUrl">;
};

/**
 * When and where, in the same three lines as the cover — DESIGN.md section
 * 4.7. The venue is its logo where the organiser supplied one, and a link to
 * the map when the committee has given one: on the day, that is the one
 * thing a participant opens the ticket for besides the QR.
 */
export function TicketDetails({ event }: TicketDetailsProps) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="font-display text-xl font-bold text-balance text-primary md:text-2xl">{formatWibDateLong(event.startsAt, "en")}</p>
      <p className="font-sans text-base tabular-nums md:text-lg">
        {formatWibTime(event.startsAt)}–{formatWibTime(event.endsAt)} WIB
      </p>
      <VenueMark venueName={event.venueName} mapUrl={event.venueMapUrl} className="mt-2" />
    </div>
  );
}
