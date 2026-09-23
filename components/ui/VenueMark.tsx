import Image from "next/image";
import { venueLogoFor } from "@/lib/brand";

/**
 * The venue line on the cover and the ticket — DESIGN.md section 4.7.
 *
 * Shows the venue's logo when the organiser has supplied one for the venue
 * in the database, otherwise the name. Either way it links to the map when
 * `events.venue_map_url` is set: on the day, that link is the one thing a
 * participant opens the ticket for besides the QR. A logo alone does not look
 * tappable, so it carries an "Open in Maps" caption inside the same link.
 */

type VenueMarkProps = {
  venueName: string;
  mapUrl: string | null;
  className?: string;
};

export function VenueMark({ venueName, mapUrl, className = "" }: VenueMarkProps) {
  const logo = venueLogoFor(venueName);

  const content = logo ? (
    <Image
      src={logo.src}
      alt={venueName}
      width={logo.width}
      height={logo.height}
      sizes="192px"
      quality={60}
      className="h-10 w-auto md:h-12"
    />
  ) : (
    venueName
  );

  if (!mapUrl) {
    return (
      <p className={`flex justify-center text-ink-muted md:text-lg ${className}`}>{content}</p>
    );
  }

  if (!logo) {
    return (
      <p className={`flex justify-center ${className}`}>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${venueName} — open in Maps`}
          className="text-ink-muted underline decoration-line underline-offset-4 hover:text-ink md:text-lg"
        >
          {content}
        </a>
      </p>
    );
  }

  return (
    <p className={`flex justify-center ${className}`}>
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex min-h-tap flex-col items-center gap-1 rounded-md px-2 py-1"
      >
        {content}
        <span className="text-sm text-ink-muted underline decoration-line underline-offset-4 group-hover:text-ink">
          Open in Maps
        </span>
      </a>
    </p>
  );
}
