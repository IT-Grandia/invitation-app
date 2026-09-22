import Image from "next/image";
import { CheckMark } from "@/components/ui/CheckMark";

type QrCardProps = {
  token: string;
  ticketNumber: string;
  /** From lib/ticket-status: live at the gate, or already spent. */
  presentation: "live" | "spent";
};

/**
 * The QR on pure white inside the "event access" frame — DESIGN.md sections
 * 6.3 and 8.9. The double rule is the card's, well outside the two-module
 * quiet zone the encoder already draws around the code, and the code itself
 * stays black on white, served unoptimized: Next's image pipeline would
 * re-encode the PNG and soften the module edges a camera locks onto
 * (docs/team/DEV-B.md rule B-2).
 *
 * Once scanned, the code dims and the green check sits over it (section
 * 6.4). The QR is kept on screen, faded, as proof it is the same ticket.
 */
export function QrCard({ token, ticketNumber, presentation }: QrCardProps) {
  return (
    <div className="mx-auto w-full max-w-72 rounded-card border border-line bg-white p-4 shadow-card">
      <div className="relative">
        <Image
          src={`/api/qr/${token}`}
          alt={`QR code for ticket ${ticketNumber}`}
          width={800}
          height={800}
          unoptimized
          priority
          className={`block h-auto w-full ${presentation === "spent" ? "opacity-25" : ""}`}
        />

        {presentation === "spent" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckMark className="h-24 w-24 text-primary drop-shadow-md" />
          </div>
        )}
      </div>
    </div>
  );
}
