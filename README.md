# Padel Invitation & Check-in

Website undangan + pendaftaran event padel dengan e-ticket QR dan check-in scan di venue.
**Tanpa login untuk peserta.** Data tersimpan di Postgres dan dicerminkan ke Google Sheets.

---

## Ringkasan

| Aspek               | Keputusan                                                            |
| ------------------- | -------------------------------------------------------------------- |
| Framework           | Next.js 15 (App Router, TypeScript)                                  |
| Hosting             | Vercel Hobby (gratis)                                                |
| Database            | Supabase Postgres (gratis) — _source of truth_                       |
| Spreadsheet         | Google Sheets via Service Account — _mirror, read-only bagi panitia_ |
| Autentikasi peserta | Tidak ada. Pakai _capability URL_ (token acak di URL)                |
| Tanggal acara       | **26 September 2026** — satu hari, tanpa pembagian sesi              |
| Autentikasi petugas | Shared secret di URL fragment, disimpan di `localStorage`            |
| QR                  | PNG di-generate server-side, isinya URL e-ticket                     |

Alasan lengkap tiap keputusan ada di [`docs/adr/`](docs/adr/).

---

## Alur singkat

```
Peserta buka undangan  →  isi form  →  dapat e-ticket + QR
                                            │
                                            ├─ Simpan QR ke HP (offline-proof)
                                            └─ Kirim link tiket ke WhatsApp (ganti-HP-proof)

Hari-H: petugas buka /scan  →  scan QR peserta  →  hijau / kuning / merah
                                            │
                                            └─ Postgres di-update, Sheets ikut ter-update
```

---

## Peta dokumen

Baca berurutan kalau kamu baru gabung tim.

| #   | Dokumen                                              | Isi                                                                 |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 00  | [`AGENTS.md`](AGENTS.md)                             | Instruksi untuk AI coding agent (Cursor, Copilot, Claude Code, dll) |
| 01  | [`docs/01-PRD.md`](docs/01-PRD.md)                   | Product requirements: masalah, user, scope, acceptance criteria     |
| 02  | [`docs/02-ARCHITECTURE.md`](docs/02-ARCHITECTURE.md) | Desain sistem, tech stack, data flow, struktur folder               |
| 03  | [`docs/03-DATA-MODEL.md`](docs/03-DATA-MODEL.md)     | ERD, DDL Postgres, skema Google Sheets                              |
| 04  | [`docs/04-API-SPEC.md`](docs/04-API-SPEC.md)         | Kontrak endpoint, request/response, error code                      |
| 05  | [`docs/05-UX-FLOWS.md`](docs/05-UX-FLOWS.md)         | Layar, state, copywriting, arah visual                              |
| 06  | [`docs/06-SECURITY.md`](docs/06-SECURITY.md)         | Threat model dan kontrol keamanan                                   |
| 07  | [`docs/07-SETUP.md`](docs/07-SETUP.md)               | Setup lokal, Supabase, Google Cloud, deploy Vercel                  |
| 08  | [`docs/08-TESTING.md`](docs/08-TESTING.md)           | Strategi test + checklist QA manual                                 |
| 09  | [`docs/09-RUNBOOK.md`](docs/09-RUNBOOK.md)           | Operasional hari-H dan penanganan insiden                           |
| 10  | [`docs/10-BACKLOG.md`](docs/10-BACKLOG.md)           | Milestone dan breakdown task                                        |
| —   | [`CONTRIBUTING.md`](CONTRIBUTING.md)                 | Alur kerja tim: branch, commit, PR, review                          |
| —   | [`docs/adr/`](docs/adr/)                             | Architecture Decision Records                                       |

---

## Quick start

> Belum ada kode. Ikuti [`docs/07-SETUP.md`](docs/07-SETUP.md) untuk bootstrap pertama kali.

```bash
pnpm install
cp .env.example .env.local   # isi kredensial, lihat docs/07-SETUP.md
pnpm db:migrate
pnpm db:seed                 # bikin 1 event contoh (26 Sep 2026)
pnpm dev                     # http://localhost:3000
```

---

## Status

`PRE-DEVELOPMENT` — dokumentasi selesai, implementasi belum dimulai.
Progres per milestone dilacak di [`docs/10-BACKLOG.md`](docs/10-BACKLOG.md).
