import Link from "next/link";
import { PadelBall } from "@/components/ui/PadelMarks";

/**
 * Rendered for any token that does not resolve — malformed, unknown, or from
 * another event. The wording never distinguishes between those cases, so the
 * page cannot be used to tell a real-but-mistyped token from a made-up one.
 * Copy per docs/05-UX-FLOWS.md section 5: no jargon, always an exit.
 */
export default function TicketNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <PadelBall className="h-14 w-14 text-primary" />

      <div>
        <h1 className="text-2xl font-bold">Tiket tidak ditemukan</h1>
        <p className="mt-3 text-ink-muted text-pretty">
          Link-nya mungkin tidak lengkap tersalin. Coba buka lagi dari chat WhatsApp kamu —
          atau kalau belum daftar, daftar dulu di bawah.
        </p>
      </div>

      <Link
        href="/daftar"
        className="min-h-tap flex w-full max-w-xs items-center justify-center rounded-pill bg-primary px-8 font-bold text-on-primary shadow-card"
      >
        Daftar Sekarang
      </Link>

      <p className="text-sm text-ink-muted text-pretty">
        Sudah daftar tapi tiketnya tetap tidak ketemu? Hubungi panitia lewat tombol di halaman
        undangan.
      </p>
    </main>
  );
}
