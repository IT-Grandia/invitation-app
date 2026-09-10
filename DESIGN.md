---
version: "1.0"
name: "Padel Day 2026 — undangan"
description: "Minimal/Zen berbasis preset AEOLIA, dengan satu warna aksi hijau lapangan."
colors:
  canvas: "#dfe8dd"
  surface: "#f2f6f0"
  surface-2: "#c9d8c6"
  line: "#b8ccb4"
  line-input: "#6f8a6a"
  ink: "#1a2230"
  ink-muted: "#41513f"
  primary: "#186b3f"
  on-primary: "#ffffff"
  accent: "#f2c200"
  on-accent: "#1a2230"
typography:
  h1:
    fontFamily: system-ui
    fontSize: "clamp(2.25rem, 11vw, 4rem)"
    fontWeight: 800
  body-md:
    fontFamily: system-ui
    fontSize: 1rem
    fontWeight: 400
  numeric:
    fontFamily: ui-monospace
    fontWeight: 700
rounded:
  sm: 4px
  md: 8px
  card: 16px
  pill: 999px
spacing:
  tap: 44px
---

## Overview

Undangan digital Padel Day 2026. Gaya **Minimal/Zen**, diturunkan dari preset
[AEOLIA](https://designmd.app/library/wind-chime-garden) — sage hijau, tenang, terang.

- **Light/Dark:** ✓ Light · ○ Dark — **satu tema saja**
- **Titik acuan:** lebar 360 px, Android Chrome
- **Anggaran halaman `/`:** di bawah 300 KB

> **Revisi 1.0 (10 Sep 2026).** Rencana dua tema yang berganti otomatis mengikuti jam WIB
> **dibatalkan**. Satu tema terang dengan aksen hijau lapangan. `lib/theme.ts` dihapus.

---

## Colors

Sumber kebenaran ada di `app/globals.css`. Tabel ini penjelasannya.

### Dari preset AEOLIA

| Token | Hex | Dipakai untuk |
|---|---|---|
| `canvas` | `#dfe8dd` | Latar halaman |
| `surface-2` | `#c9d8c6` | Blok sekunder, footer |
| `line` | `#b8ccb4` | Garis pemisah dekoratif |
| `ink` | `#1a2230` | Teks utama |

### Tambahan di luar preset, dan alasannya

| Token | Hex | Kenapa ditambahkan |
|---|---|---|
| `surface` | `#f2f6f0` | Preset tidak punya warna kartu yang lebih terang dari latar |
| `ink-muted` | `#41513f` | Turunan `#3d4a3c` preset, disesuaikan agar tetap ≥ 4.5:1 |
| `line-input` | `#6f8a6a` | 🔴 Batas field form wajib 3:1 (WCAG 1.4.11). Garis dekoratif tidak wajib, jadi keduanya dipisah |
| **`primary`** | **`#186b3f`** | 🔴 **Preset tidak punya warna aksi.** Tombol dari warna preset hanya 1.36:1 dari latar — praktis tak terlihat di bawah matahari |
| `on-primary` | `#ffffff` | Teks di atas tombol |
| `accent` | `#f2c200` | Bola padel. **Latar saja** — sebagai teks di atas canvas gagal AA |
| `on-accent` | `#1a2230` | Teks di atas chip aksen |

### Status

| Token | Hex |
|---|---|
| `success` | `#186b3f` |
| `warning` | `#7a5600` |
| `danger` | `#a3271f` |

### Kontras terverifikasi

Seluruh pasangan diukur, bukan dikira-kira. Ulangi pengukuran setiap kali warna berubah.

```
teks utama di canvas         12.71:1
teks sekunder di canvas       6.76:1
tombol putih di primary       6.53:1
primary sebagai teks          5.20:1
chip gelap di accent          9.50:1
danger di canvas              5.83:1
batas field form              3.03:1   (WCAG 1.4.11)
```

**Perbandingan yang paling menentukan:**

```
tombol warna preset  vs latar : 1.36:1   nyaris menyatu
tombol hijau lapangan vs latar : 5.20:1   langsung terlihat
```

---

## Typography

| Peran | Font | Alasan |
|---|---|---|
| Judul & isi | **system-ui** | Sesuai preset. Nol byte, tampil di frame pertama |
| Angka | **monospace bawaan sistem** | Countdown, nomor tiket, jam rundown |

🔴 **Tidak ada satu pun font yang diunduh.** Halaman ini nol permintaan font.

Lebar angka yang seragam — supaya countdown tidak bergeser tiap detik — datang dari
`tabular-nums` pada elemennya, bukan dari font monospace. Roboto di Android dan SF Pro
di iOS dua-duanya mendukung angka tabular, jadi jaminannya sudah ada tanpa mengunduh
apa pun.

Rancangan sebelumnya memuat JetBrains Mono dengan taksiran 15 KB. Setelah diukur di
bundle, ternyata **39,5 KB** — dibayar untuk sesuatu yang sudah disediakan font sistem,
jadi dilepas. Courier New dari preset tetap dipertahankan di urutan terakhir tumpukan
`--font-mono`, sebagai penghormatan ke preset sekaligus lantai untuk perangkat lawas.

Kelas `font-display` tetap ada di kosakata token dan saat ini mengarah ke `system-ui`,
supaya Dev A dan Dev C punya kelas yang stabil kalau suatu saat font display ditambahkan.

---

## Motion

- Cover masuk bertahap: 0 ms → 80 ms → 200 ms → 320 ms → 460 ms
- Garis lapangan menyapu dari samping saat cover muncul
- Cover keluar memudar ke atas, 420 ms
- 🔴 `prefers-reduced-motion` dihormati di lapisan base — seluruh durasi dipangkas ke 0.01 ms,
  dan setiap animasi memakai `fill-mode: both` supaya isinya tetap tampil, bukan hilang

---

## Aset

### Marka padel — digambar sendiri

Ada di `components/ui/PadelMarks.tsx`: `PadelBall`, `PadelRacket`, `PadelCourt`.

Tidak ada pustaka ikon besar yang punya padel. Yang tersedia raket tenis — dan raket tenis
bersenar, sedangkan raket padel padat dan berlubang. Siapa pun yang main padel langsung sadar.

Menggambarnya sendiri memberi empat hal: nol dependency, nol pertanyaan lisensi, nol request
HTTP tambahan, dan `currentColor` di seluruh path — jadi marka otomatis ikut token warna.

`PadelCourt` digambar dengan proporsi asli: 20 m × 10 m, net di tengah, garis servis 6,95 m
dari net, garis tengah membelah kotak servis. Dipakai sebagai latar cover dengan opasitas
rendah — sekitar 2 KB, dibanding ~150 KB kalau memakai foto.

### Ikon antarmuka

| Sumber | Lisensi | Catatan |
|---|---|---|
| **[Lucide](https://lucide.dev)** | ISC — bebas komersial, tanpa atribusi | Pilihan utama. SVG bisa disalin satuan dari webnya **tanpa memasang paket**, jadi `package.json` milik Dev C tidak tersentuh |
| [Heroicons](https://heroicons.com) | MIT | Alternatif, buatan tim Tailwind |
| [Simple Icons](https://simpleicons.org) | CC0 untuk path | Khusus logo WhatsApp. Mereknya tetap milik Meta |

**Yang perlu hati-hati:** Flaticon gratis **mewajibkan atribusi** di halaman. SVG Repo
lisensinya berbeda-beda per file dan harus dicek satu per satu.

### Foto venue

Menunggu dari panitia. Memasang foto lapangan lain lalu menyebutnya venue acara ini
menyesatkan peserta. Sampai fotonya ada, `PadelCourt` yang menggantikan.

---

## Aturan yang tidak boleh dilanggar

1. **Target sentuh minimal 44 × 44 px** — pakai `min-h-tap` / `min-w-tap`
2. **Ring fokus tidak boleh dihapus** — 3 px solid `primary`, offset 2 px
3. **`accent` tidak pernah jadi warna teks** di atas latar terang — hanya latar chip
4. **Halaman `/` di bawah 300 KB** — kalau harus memilih antara animasi dan kecepatan, pilih kecepatan
5. **Warna baru wajib diukur kontrasnya** sebelum masuk `globals.css`
6. **Token hanya ditambahkan Dev B.** Dev A dan Dev C memakai, tidak menambah

---

## Kosakata token

Ini yang dipakai Dev A dan Dev C, tanpa perlu menanyakan kode warna:

```
bg-canvas / bg-surface / bg-surface-2
text-ink / text-ink-muted
bg-primary + text-on-primary
bg-accent + text-on-accent
text-success / text-warning / text-danger
border-line          -> garis dekoratif
border-line-input    -> batas field form, sudah 3:1
min-h-tap / min-w-tap
rounded-sm / rounded-md / rounded-card / rounded-pill
shadow-card
font-sans / font-display / font-mono
text-hero / text-countdown
```

---

<!-- Diturunkan dari: https://designmd.app/library/wind-chime-garden · designmd.app -->
