import Image from "next/image";

type QrCardProps = {
  token: string;
  ticketNumber: string;
  /** From lib/ticket-status: live at the gate, already spent, or not usable. */
  presentation: "live" | "spent" | "hidden";
  /** Shown in place of the QR when it is hidden. */
  hiddenReason?: string;
};

/**
 * The QR sits on pure white, not on the sage card colour, and is served
 * unoptimized: Next's image pipeline would re-encode the PNG and soften the
 * module edges that a camera locks onto. docs/team/DEV-B.md rule B-2 — the
 * image has to survive a 30% screen, a screenshot, and a photo of a photo.
 */
export function QrCard({ token, ticketNumber, presentation, hiddenReason }: QrCardProps) {
  if (presentation === "hidden") {
    return (
      <div className="mx-auto w-full max-w-72 rounded-card border border-line bg-surface-2 px-6 py-10 text-center">
        <p className="text-ink-muted text-pretty">{hiddenReason}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-72">
      <div className="relative rounded-card bg-white p-4 shadow-card">
        <Image
          src={`/api/qr/${token}`}
          alt={`QR tiket ${ticketNumber}`}
          width={800}
          height={800}
          unoptimized
          priority
          className={`block h-auto w-full ${presentation === "spent" ? "opacity-25" : ""}`}
        />

        {presentation === "spent" && (
          <p className="absolute inset-0 flex items-center justify-center text-center font-bold text-info">
            Sudah dipakai
          </p>
        )}
      </div>

      {presentation === "live" && (
        <p className="mt-3 text-center text-sm text-ink-muted">
          <span aria-hidden="true">💡 </span>
          Naikkan kecerahan layar sebelum di-scan
        </p>
      )}
    </div>
  );
}
