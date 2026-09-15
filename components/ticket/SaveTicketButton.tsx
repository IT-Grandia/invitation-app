"use client";

import { useState } from "react";

type SaveTicketButtonProps = {
  token: string;
  ticketNumber: string;
  /** Full ticket URL, included as text alongside the image in the share sheet. */
  ticketUrl: string;
  eventName: string;
};

type Phase = "idle" | "preparing" | "done" | "error";

const LABEL: Record<Phase, string> = {
  idle: "Download QR Code",
  preparing: "Preparing image…",
  done: "Saved",
  error: "Download QR Code",
};

/**
 * The number one risk on this track — docs/team/DEV-B.md rule B-1.
 *
 * The Web Share API is the primary path, not the fallback. On iOS, `<a download>`
 * drops the file into the Files app rather than Photos, and most people read that
 * as "it did nothing". The share sheet puts "Save to Photos" and WhatsApp one tap
 * away and behaves the same on Android. Plain download is kept only for desktop
 * browsers that cannot share files.
 */
export function SaveTicketButton({ token, ticketNumber, ticketUrl, eventName }: SaveTicketButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const fileName = `ticket-${ticketNumber}.png`;

  async function save() {
    setPhase("preparing");

    let blob: Blob;
    try {
      const response = await fetch(`/api/qr/${token}`);
      if (!response.ok) throw new Error(`QR fetch failed: ${response.status}`);
      blob = await response.blob();
    } catch {
      setPhase("error");
      return;
    }

    const file = new File([blob], fileName, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${eventName} ticket`,
          text: `Your ${eventName} ticket: ${ticketUrl}`,
        });
        setPhase("done");
      } catch (error) {
        // The person closed the share sheet. That is a choice, not a failure —
        // put the button back exactly as it was.
        if (error instanceof DOMException && error.name === "AbortError") {
          setPhase("idle");
          return;
        }
        setPhase("error");
      }
      return;
    }

    // Desktop fallback. The object URL is released on the next tick so the
    // click has a chance to start the download before it is revoked.
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setPhase("done");
  }

  return (
    <div>
      <button
        type="button"
        onClick={save}
        disabled={phase === "preparing"}
        aria-busy={phase === "preparing"}
        className="min-h-tap flex w-full items-center justify-center gap-2 rounded-pill bg-primary px-8 font-display text-lg font-semibold tracking-[0.06em] text-on-primary shadow-card transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-14 md:text-xl"
      >
        {phase === "done" && <span aria-hidden="true">✓ </span>}
        {LABEL[phase]}
      </button>

      {phase === "error" && (
        <p role="alert" className="mt-2 text-center text-sm text-danger text-pretty">
          The image could not be prepared. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
