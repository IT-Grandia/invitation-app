"use client";

import { useSyncExternalStore } from "react";
import { readStoredTicket } from "@/lib/ticket-storage";
import { TicketBanner } from "./TicketBanner";

// Re-read when another tab changes the key — e.g. "Hapus tiket dari HP ini"
// pressed on the ticket page while the invitation is open in a second tab.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Second-layer banner, rendered only when the server found no ticket cookie.
 *
 * useSyncExternalStore reads localStorage with a server snapshot of null, so
 * the hydrated markup matches the server's and the banner appears in the first
 * client render after that — the "muncul setelah hidrasi" path in
 * docs/05-UX-FLOWS.md section 3, without a setState-in-effect.
 */
export function StoredTicketBanner() {
  const token = useSyncExternalStore(subscribe, readStoredTicket, () => null);

  if (!token) return null;

  return <TicketBanner ticketHref={`/t/${token}`} />;
}
