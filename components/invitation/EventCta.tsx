import Link from "next/link";
import { formatWibDate } from "@/lib/datetime";
import type { RegistrationState } from "@/lib/event-state";

/**
 * The seven call-to-action states from docs/05-UX-FLOWS.md section 4.1.
 *
 * Six come from lib/event-state (event row + head count); the seventh, holding
 * a ticket already, is decided by the page from the cookie. Anything shown here
 * is display only — the server re-checks the quota on submit,
 * docs/06-SECURITY.md A9.
 */
export type CtaState = RegistrationState | { kind: "has_ticket"; ticketHref: string };

/** Below this many seats left, the count switches to an urgent red line. */
const SCARCITY_THRESHOLD = 5;

const BUTTON_BASE =
  "min-h-tap flex w-full max-w-xs items-center justify-center rounded-pill px-8 font-display text-lg font-bold";

export function EventCta({ state, registerHref }: { state: CtaState; registerHref: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6">{renderState(state, registerHref)}</div>
  );
}

function renderState(state: CtaState, registerHref: string) {
  switch (state.kind) {
    case "has_ticket":
      return (
        <Link href={state.ticketHref} className={`${BUTTON_BASE} bg-primary text-on-primary shadow-card`}>
          Lihat Tiket Saya
        </Link>
      );

    case "open":
      return (
        <>
          <Link href={registerHref} className={`${BUTTON_BASE} bg-primary text-on-primary shadow-card`}>
            Daftar Sekarang
          </Link>
          {state.remaining !== null && <SeatCount remaining={state.remaining} />}
        </>
      );

    case "not_open_yet":
      return (
        <>
          <DisabledButton>Belum Dibuka</DisabledButton>
          <p className="text-sm text-ink-muted">Pendaftaran dibuka {formatWibDate(state.opensAt)}.</p>
        </>
      );

    case "closed":
      return (
        <>
          <DisabledButton>Pendaftaran Ditutup</DisabledButton>
          <p className="text-sm text-ink-muted">
            Hubungi panitia kalau kamu masih ingin ikut.
          </p>
        </>
      );

    case "full":
      return (
        <>
          <DisabledButton>Kuota Penuh</DisabledButton>
          <p className="text-sm text-ink-muted">
            Hubungi panitia untuk masuk waiting list.
          </p>
        </>
      );

    case "past":
      return (
        <>
          <DisabledButton>Acara Telah Selesai</DisabledButton>
          <p className="text-sm text-ink-muted">Terima kasih sudah main bareng!</p>
        </>
      );
  }
}

/**
 * A real disabled <button> rather than a greyed-out link: a link that goes
 * nowhere still reads as clickable to a screen reader.
 */
function DisabledButton({ children }: { children: string }) {
  return (
    <button type="button" disabled className={`${BUTTON_BASE} border border-line bg-surface-2 text-ink-muted`}>
      {children}
    </button>
  );
}

function SeatCount({ remaining }: { remaining: number }) {
  if (remaining <= SCARCITY_THRESHOLD) {
    return (
      <p className="text-sm font-bold text-danger">Tinggal {remaining} slot!</p>
    );
  }

  return <p className="text-sm text-ink-muted">Sisa {remaining} slot</p>;
}
