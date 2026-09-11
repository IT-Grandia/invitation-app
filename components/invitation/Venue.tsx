import { Section } from "./Section";

type VenueProps = {
  name: string;
  address: string | null;
  mapUrl: string | null;
};

/**
 * Deliberately a link, not an embedded map.
 *
 * A Google Maps iframe pulls in several hundred kilobytes on its own and would
 * eat the entire page budget from docs/team/DEV-B.md rule B-5 by itself. The
 * link opens the visitor's own Maps app, which is what they want anyway —
 * directions, not a picture of a map.
 */
export function Venue({ name, address, mapUrl }: VenueProps) {
  return (
    <Section id="lokasi" title="Lokasi">
      <div className="rounded-card border border-line bg-surface p-5">
        <p className="font-display text-xl font-bold">{name}</p>
        {/* The seed fills both with "TBA"; only show an address that adds something. */}
        {address && address !== name && (
          <p className="mt-1 text-ink-muted text-pretty">{address}</p>
        )}

        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-tap mt-4 inline-flex items-center rounded-pill bg-accent px-5 font-semibold text-on-accent"
          >
            Buka di Google Maps
          </a>
        )}
      </div>
    </Section>
  );
}
