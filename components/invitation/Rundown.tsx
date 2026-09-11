import type { RundownEntry } from "@/lib/validation/event-content";
import { Section } from "./Section";

export function Rundown({ entries }: { entries: readonly RundownEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <Section id="rundown" title="Rundown">
      <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {entries.map((entry, index) => (
          // Two rundown rows can legitimately share a time, e.g. parallel courts.
          <li key={`${index}-${entry.time}`} className="flex gap-4 px-5 py-3.5">
            <span className="font-mono font-bold tabular-nums">{entry.time}</span>
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
