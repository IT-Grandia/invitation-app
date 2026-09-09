type ContactFooterProps = {
  /** Committee WhatsApp number in E.164 without the plus, e.g. 628123456789.
   *  Null until the committee supplies one — docs/01-PRD.md section 10.1. */
  whatsapp: string | null;
  eventName: string;
};

/**
 * The last thing on the page, and the safety net for the whole product.
 *
 * docs/05-UX-FLOWS.md section 3: a participant who has lost their cookie,
 * localStorage, WhatsApp message and saved QR has no self-service recovery by
 * design — contacting the committee is the only way back. That makes this
 * button the fallback for every failure mode in the system, which is why it
 * sits at the bottom of every visit rather than behind a menu.
 */
export function ContactFooter({ whatsapp, eventName }: ContactFooterProps) {
  const message = `Halo panitia ${eventName}, saya mau tanya soal acaranya.`;
  const href = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <footer className="mt-auto border-t border-line bg-surface-2">
      <div className="mx-auto w-full max-w-2xl px-6 py-10 text-center">
        <p className="font-display text-xl font-bold">Butuh bantuan?</p>
        <p className="mt-2 text-ink-muted text-pretty">
          Ada yang mau ditanyakan, atau tiketmu hilang? Hubungi panitia ya.
        </p>

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-tap mt-5 inline-flex items-center rounded-pill border border-line-input px-6 font-semibold"
          >
            Chat Panitia via WhatsApp
          </a>
        ) : (
          <p className="mt-5 text-sm text-ink-muted">
            Kontak panitia menyusul sebelum pendaftaran dibuka.
          </p>
        )}

        <p className="mt-8 text-xs text-ink-muted">{eventName}</p>
      </div>
    </footer>
  );
}
