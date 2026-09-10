type GreetingProps = {
  dateLabel: string;
};

/**
 * The welcome that follows the cover. Kept short and written in "kamu" as
 * docs/05-UX-FLOWS.md section 5 requires — this is a community sports invite,
 * not a formal letter.
 */
export function Greeting({ dateLabel }: GreetingProps) {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 pt-14 text-center">
      <p className="font-display text-2xl font-bold">Halo!</p>

      <p className="mt-4 text-lg text-pretty">
        Kami ajak kamu main padel bareng, {dateLabel}.
      </p>

      <p className="mt-3 text-lg text-ink-muted text-pretty">
        Santai, bukan turnamen. Datang sendiri juga nggak apa-apa — nanti
        dipasangkan di lapangan.
      </p>

      <p className="mt-6 text-sm text-ink-muted">Geser ke bawah buat lihat detailnya.</p>
    </section>
  );
}
