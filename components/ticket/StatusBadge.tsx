import { formatWibTime } from "@/lib/datetime";
import type { TicketStatus } from "@/lib/ticket-status";

/**
 * The four badge states from docs/05-UX-FLOWS.md section 4.3. Each carries an
 * icon and a word, never colour alone — docs/05-UX-FLOWS.md section 6.
 */
const PRESENTATION = {
  registered: { icon: "✓", label: "Terdaftar", className: "bg-success text-white" },
  checked_in: { icon: "✓", label: "Sudah hadir", className: "bg-info text-white" },
  cancelled: { icon: "✕", label: "Dibatalkan", className: "bg-danger text-white" },
  waitlist: { icon: "⏳", label: "Waiting list", className: "bg-accent text-on-accent" },
} as const;

export function StatusBadge({ status }: { status: TicketStatus }) {
  const { icon, label, className } = PRESENTATION[status.kind];
  const detail = status.kind === "checked_in" ? ` · ${formatWibTime(status.at)}` : "";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-1.5 text-sm font-bold tracking-wide uppercase ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
      {detail}
    </span>
  );
}
