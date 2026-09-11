"use client";

import { useState } from "react";
import { clearStoredTicket } from "@/lib/ticket-storage";

type Phase = "idle" | "working" | "done" | "error";

/**
 * "Hapus tiket dari HP ini" — for a ticket opened on a borrowed phone.
 *
 * Clears both persistence layers: the HttpOnly cookie through Dev A's
 * POST /api/session/clear (JavaScript cannot touch it directly), and the
 * localStorage copy. The ticket itself is untouched — its URL keeps working,
 * which is the whole point of a capability URL (docs/04-API-SPEC.md 3.1).
 *
 * Small text, not a button, per docs/05-UX-FLOWS.md section 4.3: it should be
 * findable, not inviting.
 */
export function ForgetDeviceButton() {
  const [phase, setPhase] = useState<Phase>("idle");

  async function forget() {
    setPhase("working");
    clearStoredTicket();

    try {
      const response = await fetch("/api/session/clear", { method: "POST" });
      if (!response.ok) throw new Error(`session clear failed: ${response.status}`);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }

  if (phase === "done") {
    return (
      <p role="status" className="text-center text-sm text-ink-muted text-pretty">
        Tiket dihapus dari HP ini. Link-nya tetap bisa dibuka kapan saja.
      </p>
    );
  }

  return (
    <div className="text-center text-sm text-ink-muted">
      <p>Pakai HP orang lain?</p>
      <button
        type="button"
        onClick={forget}
        disabled={phase === "working"}
        aria-busy={phase === "working"}
        className="min-h-tap mt-1 px-4 font-semibold text-ink underline underline-offset-4 disabled:opacity-60"
      >
        {phase === "working" ? "Menghapus…" : "Hapus tiket dari HP ini"}
      </button>
      {phase === "error" && (
        <p role="alert" className="mt-2 text-danger text-pretty">
          Belum berhasil. Cek koneksi kamu, lalu coba lagi.
        </p>
      )}
    </div>
  );
}
