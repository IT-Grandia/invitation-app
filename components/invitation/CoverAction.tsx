"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { formatWibDate } from "@/lib/datetime";
import type { RegistrationState } from "@/lib/event-state";
import { readStoredTicket } from "@/lib/ticket-storage";

/**
 * The one button on the cover, and the line under it when the button cannot
 * lead anywhere — DESIGN.md section 6.1.
 *
 * Two layers decide whether the visitor already holds a ticket. The HttpOnly
 * cookie is read on the server and arrives as `serverTicketToken`; localStorage
 * is read here, after hydration, through useSyncExternalStore with a server
 * snapshot of null so the hydrated markup matches what the server sent. Either
 * layer turns the button into "View Your Ticket": at the registration desk
 * nobody should need more than one tap to reach their QR.
 *
 * Everything shown is display only. The server re-checks the window and the
 * quota when the form is submitted (docs/06-SECURITY.md A9).
 */

export type CoverActionProps = {
  state: RegistrationState;
  /** From the ticket cookie, validated by the page; undefined when absent. */
  serverTicketToken?: string;
  registerHref: string;
  contactWhatsapp: string | null;
};

const BUTTON =
  "min-h-tap inline-flex w-full items-center justify-center rounded-pill px-8 font-display text-lg font-semibold tracking-[0.06em] md:min-h-14 md:text-xl";
const BUTTON_LIVE = `${BUTTON} bg-primary text-on-primary shadow-card transition-transform active:scale-[0.98]`;
const BUTTON_OFF = `${BUTTON} border border-line bg-surface-2 text-ink-muted`;

// Re-read when another tab changes the key.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function CoverAction({
  state,
  serverTicketToken,
  registerHref,
  contactWhatsapp,
}: CoverActionProps) {
  const storedToken = useSyncExternalStore(subscribe, readStoredTicket, () => null);
  const ticketToken = serverTicketToken ?? storedToken;

  if (ticketToken) {
    return (
      <Link href={`/t/${ticketToken}`} className={BUTTON_LIVE}>
        View Your Ticket
      </Link>
    );
  }

  switch (state.kind) {
    case "open":
      return (
        <Link href={registerHref} className={BUTTON_LIVE}>
          Open Invitation
        </Link>
      );

    case "not_open_yet":
      return (
        <Closed label="Open Invitation">
          Registration opens {formatWibDate(state.opensAt, "en")}.
        </Closed>
      );

    case "closed":
      return (
        <Closed label="Registration Closed">
          Registration is closed. <Contact whatsapp={contactWhatsapp} />
        </Closed>
      );

    case "full":
      return (
        <Closed label="Fully Booked">
          Registration is full.{" "}
          <Contact whatsapp={contactWhatsapp} action="to join the waiting list" />
        </Closed>
      );

    case "past":
      return <Closed label="Event Ended">This event has ended.</Closed>;
  }
}

/**
 * A real disabled <button> rather than a greyed-out link: a link that goes
 * nowhere still reads as clickable to a screen reader.
 */
function Closed({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" disabled className={BUTTON_OFF}>
        {label}
      </button>
      <p className="text-sm text-ink-muted text-pretty">{children}</p>
    </div>
  );
}

/** "Contact the organiser" as a WhatsApp link when the committee gave a number. */
function Contact({ whatsapp, action }: { whatsapp: string | null; action?: string }) {
  const suffix = action ? ` ${action}.` : ".";

  if (!whatsapp) {
    return <>Contact the organiser{suffix}</>;
  }

  return (
    <>
      <a
        href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary underline underline-offset-2"
      >
        Contact the organiser
      </a>
      {suffix}
    </>
  );
}
