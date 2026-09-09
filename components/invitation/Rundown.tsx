import { Section } from "./Section";

export type RundownEntry = {
  /** Wall-clock WIB, already formatted — the committee edits these as text. */
  time: string;
  activity: string;
};

export function Rundown({ entries }: { entries: readonly RundownEntry[] }) {
  return (
    <Section id="rundown" title="Rundown">
      <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {entries.map((entry) => (
          <li key={entry.time} className="flex gap-4 px-5 py-3.5">
            <span className="font-display font-bold tabular-nums">{entry.time}</span>
            <span className="text-ink-muted text-pretty">{entry.activity}</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-sm text-ink-muted">
        Jam bisa bergeser sedikit di lapangan, santai saja.
      </p>
    </Section>
  );
}
