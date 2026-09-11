import type { EventDetail } from "@/lib/validation/event-content";
import { Section } from "./Section";

/** "Tentang Acara" from docs/01-PRD.md section 6.1: format, level, what to
 *  bring, dress code. A description list rather than cards — a participant
 *  scanning on a phone reads a label/value pair faster than a grid. */
export function EventDetails({ items }: { items: readonly EventDetail[] }) {
  // Empty until the committee fills it in — an empty box is worse than no box.
  if (items.length === 0) return null;

  return (
    <Section id="tentang" title="Tentang Acara">
      <dl className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {items.map((item, index) => (
          // The committee types these by hand; two rows can share a label.
          <div key={`${index}-${item.label}`} className="px-5 py-4">
            <dt className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
              {item.label}
            </dt>
            <dd className="mt-1 text-pretty">{item.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
