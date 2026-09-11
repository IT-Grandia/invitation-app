import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// No web font is loaded at all. DESIGN.md specifies system-ui, and the digits
// that must not jitter — ticket number, rundown times — get their
// fixed width from `tabular-nums`, which both Roboto on Android and SF Pro on
// iOS support. A loaded monospace face cost 39.5 KB to buy something the
// system fonts already provide.

// Falls back to localhost so the build never breaks when the variable is unset;
// the real value comes from NEXT_PUBLIC_SITE_URL and must point at the final
// domain before the first participant registers (docs/01-PRD.md section 10.1).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Padel Day 2026",
    template: "%s · Padel Day 2026",
  },
  description:
    "Undangan dan pendaftaran Padel Day 2026. Daftar sekali, tiket QR kamu langsung jadi.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Padel Day 2026",
    title: "Padel Day 2026",
    description:
      "Undangan dan pendaftaran Padel Day 2026. Daftar sekali, tiket QR kamu langsung jadi.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom stays available: docs/05-UX-FLOWS.md section 6 requires the page to
  // still work at 200%.
  maximumScale: 5,
  themeColor: "#dfe8dd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
