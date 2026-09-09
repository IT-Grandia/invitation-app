import { Section } from "./Section";

export type FaqEntry = {
  question: string;
  answer: string;
};

/**
 * Built on native <details>, not a JavaScript accordion.
 *
 * It costs zero kilobytes, works before hydration, and browsers already give it
 * correct keyboard and screen reader behaviour — three things a hand-rolled
 * accordion has to earn back one bug at a time.
 */
export function Faq({ entries }: { entries: readonly FaqEntry[] }) {
  return (
    <Section id="faq" title="Pertanyaan yang Sering Muncul">
      <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {entries.map((entry) => (
          <details key={entry.question} className="group">
            <summary className="min-h-tap flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold">
              {entry.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-ink-muted transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-5 pb-4 text-ink-muted text-pretty">{entry.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
