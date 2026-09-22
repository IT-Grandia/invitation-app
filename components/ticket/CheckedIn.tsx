import { formatWibTime } from "@/lib/datetime";
import { COMMUNITY_LABELS, parseCommunity } from "@/lib/validation/survey";
import { QrCard } from "./QrCard";

type CheckedInProps = {
  token: string;
  ticketNumber: string;
  fullName: string;
  /** Raw column value; rows from before the survey existed hold null. */
  community: string | null;
  checkedInAt: Date;
};

/**
 * The screen after the QR has been scanned — DESIGN.md section 6.4, as the
 * organiser specified it: CHECK-IN, the green check over the QR, "Checked
 * In", "Welcome!", the name, the community chosen on the form, the time.
 *
 * The same elements appear on the scanner (Dev C) so the participant's phone
 * and the desk agree. No buttons: there is nothing left to save or send.
 */
export function CheckedIn({ token, ticketNumber, fullName, community, checkedInAt }: CheckedInProps) {
  const communityCode = parseCommunity(community);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <p className="font-sans text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase md:text-sm">
        Check-in
      </p>

      <QrCard token={token} ticketNumber={ticketNumber} presentation="spent" />

      <div>
        <h1 className="font-display text-3xl font-bold text-primary md:text-4xl">Checked In</h1>
        <p className="mt-1 font-sans text-lg tracking-[0.04em] text-ink-muted md:text-xl">Welcome!</p>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="font-display text-xl font-bold text-balance md:text-2xl">{fullName}</p>
        {/* Hidden, not blank, when the row predates the survey. */}
        {communityCode && <p className="text-ink-muted">{COMMUNITY_LABELS[communityCode]}</p>}
        <p className="font-sans text-sm tabular-nums">{formatWibTime(checkedInAt)} WIB</p>
      </div>
    </div>
  );
}
