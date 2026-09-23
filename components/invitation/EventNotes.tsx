import type { EventDetail } from "@/lib/validation/event-content";

/**
 * The committee's important notes — DESIGN.md section 5.1 — on the cover's
 * "When & where" card and on the ticket.
 *
 * The text comes from `events.details`, so the committee can change a time or
 * a wording with one SQL statement and no deploy. Entries are validated when
 * the event is read; a malformed one is dropped rather than shown. An event
 * without notes renders nothing at all.
 */

type EventNotesProps = {
  details: EventDetail[];
  className?: string;
};

export function EventNotes({ details, className = "" }: EventNotesProps) {
  if (details.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {details.map((note) => (
        // surface-2 on a surface card: a shade darker, so it stands out
        // without the shouting of an accent block.
        <p
          key={note.label}
          className="rounded-md bg-surface-2 px-4 py-3 text-sm text-ink text-pretty"
        >
          <span className="font-semibold">{note.label}:</span> {note.value}
        </p>
      ))}
    </div>
  );
}
