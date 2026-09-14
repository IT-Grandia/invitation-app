"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  POLL_INTERVAL_MS,
  shouldPoll,
  type PollingWindow,
  type TicketStatusResponse,
} from "@/lib/live-status";

type LiveStatusProps = {
  token: string;
  /** ISO strings, not Dates: props cross the server/client boundary. */
  windowStart: string;
  windowEnd: string;
};

/**
 * Turns the ticket into the "Checked In" screen a few seconds after the
 * scanner reads it, without the participant touching anything — DESIGN.md
 * section 6.4. Rendered only while the ticket is still live; once the page
 * re-renders as checked in, this component is gone with it.
 *
 * Every five seconds, while the tab is on screen and the event window is
 * open (lib/live-status.ts), it asks /api/ticket-status for one boolean. On
 * `true` it refreshes the server component once and stops. Returning to the
 * tab asks straight away, so a phone that was locked at the desk catches up
 * the moment it is unlocked. Failures are ignored: the QR is still on screen,
 * and a bad signal at the venue must never put an error in front of it.
 *
 * Renders nothing.
 */
export function LiveStatus({ token, windowStart, windowEnd }: LiveStatusProps) {
  const router = useRouter();

  useEffect(() => {
    const pollWindow: PollingWindow = { start: new Date(windowStart), end: new Date(windowEnd) };
    let stopped = false;
    let inFlight = false;

    async function check() {
      if (stopped || inFlight) return;
      if (!shouldPoll(pollWindow, new Date(), document.visibilityState)) return;

      inFlight = true;
      try {
        const response = await fetch(`/api/ticket-status/${token}`, { cache: "no-store" });
        if (!response.ok) return;

        const body = (await response.json()) as TicketStatusResponse;
        if (body.checkedIn && !stopped) {
          stopped = true;
          router.refresh();
        }
      } catch {
        // Offline or blocked: try again on the next tick, say nothing.
      } finally {
        inFlight = false;
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }

    const timer = setInterval(() => void check(), POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, windowStart, windowEnd, router]);

  return null;
}
