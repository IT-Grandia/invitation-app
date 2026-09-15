"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { POLL_INTERVAL_MS, shouldPoll, type TicketStatusResponse } from "@/lib/live-status";

type LiveStatusProps = {
  token: string;
};

/**
 * Turns the ticket into the "Checked In" screen a few seconds after the
 * scanner reads it, without the participant touching anything — DESIGN.md
 * section 5.4. Rendered only while the ticket is still live; once the page
 * re-renders as checked in, this component is gone with it.
 *
 * Every five seconds, while the tab is on screen (lib/live-status.ts), it
 * asks /api/ticket-status for one boolean. On `true` it refreshes the server
 * component once and stops. Returning to the tab asks straight away, so a
 * phone that was locked at the desk catches up the moment it is unlocked.
 * Failures are ignored: the QR is still on screen, and a bad signal at the
 * venue must never put an error in front of it.
 *
 * Renders nothing.
 */
export function LiveStatus({ token }: LiveStatusProps) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    // Set from a 429's Retry-After: no request until then. The budget is per
    // ticket, so this only trips with the same ticket open in many tabs.
    let pausedUntil = 0;

    async function check() {
      if (stopped || inFlight || Date.now() < pausedUntil) return;
      if (!shouldPoll(document.visibilityState)) return;

      inFlight = true;
      try {
        const response = await fetch(`/api/ticket-status/${token}`, { cache: "no-store" });
        if (response.status === 429) {
          const seconds = Number(response.headers.get("Retry-After")) || 30;
          pausedUntil = Date.now() + seconds * 1000;
          return;
        }
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
  }, [token, router]);

  return null;
}
