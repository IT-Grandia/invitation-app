import { Section } from "./Section";

export type EventDetailItem = {
  label: string;
  value: string;
};

/** "Tentang Acara" from docs/01-PRD.md section 6.1: format, level, what to
 *  bring, dress code. A description list rather than cards — a participant
 *  scanning on a phone reads a label/value pair faster than a grid. */
export function EventDetails({ items }: { items: readonly EventDetailItem[] }) {
  return (
    <Section id="tentang" title="Tentang Acara">
      <dl className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-4">
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
