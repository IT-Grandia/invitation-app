type SaveTicketButtonProps = {
  token: string;
  ticketNumber: string;
};

/**
 * The number one risk on this track — docs/team/DEV-B.md rule B-1.
 *
 * A plain link to the image, served as an attachment: one tap, one file, no
 * menu in between. It replaces the Web Share sheet, which put the image behind
 * a list of apps where "Copy" sits first and saving is a guess.
 *
 * Both halves matter. The `download` attribute names the file, and the route's
 * Content-Disposition makes the browser save it even where that attribute is
 * ignored, which is the case in several in-app browsers. On iPhone the file
 * lands in Files rather than Photos; the ticket also reaches the participant
 * as a WhatsApp link, so the image is a keepsake, not the only way in.
 */
export function SaveTicketButton({ token, ticketNumber }: SaveTicketButtonProps) {
  return (
    <a
      href={`/api/qr/${token}?download=1`}
      download={`ticket-${ticketNumber}.png`}
      className="min-h-tap flex w-full items-center justify-center rounded-pill bg-primary px-8 py-2 text-center font-sans text-base leading-tight font-semibold tracking-[0.1em] text-balance text-on-primary uppercase shadow-card transition-all hover:opacity-95 active:scale-[0.99] md:min-h-14 md:text-lg"
    >
      Download QR Code
    </a>
  );
}
