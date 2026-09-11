"use client";

import { useEffect, useRef, useState } from "react";

const FEEDBACK_MS = 2000;

/**
 * Copies the ticket URL. `navigator.clipboard` needs a secure context and a
 * user gesture; both hold here, but older WebViews still lack it, so a hidden
 * textarea + execCommand stays as the floor.
 */
export function CopyLinkButton({ ticketUrl }: { ticketUrl: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ticketUrl);
      } else {
        const area = document.createElement("textarea");
        area.value = ticketUrl;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.append(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), FEEDBACK_MS);
    } catch {
      // Clipboard access was refused. Selecting the text for a manual copy is
      // the honest fallback; the URL is also in the address bar.
      window.prompt("Salin link tiket kamu:", ticketUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="min-h-tap flex flex-1 items-center justify-center gap-1.5 rounded-pill border border-line-input px-3 text-sm font-semibold"
    >
      <span aria-hidden="true">{copied ? "✓" : "🔗"}</span>
      <span aria-live="polite">{copied ? "Tersalin" : "Salin link"}</span>
    </button>
  );
}
