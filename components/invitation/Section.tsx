import type { ReactNode } from "react";

type SectionProps = {
  id?: string;
  title: string;
  children: ReactNode;
};

/** Shared frame for every block of the invitation, so spacing and heading
 *  rhythm stay identical down the page. */
export function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="mx-auto w-full max-w-2xl px-6 py-9">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
