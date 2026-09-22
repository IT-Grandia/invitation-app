import type { Metadata, Viewport } from "next";
import { Jost, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// The faces closest to the organiser's flyer (DESIGN.md section 2.2). next/font
// downloads them at build time and serves them from /_next/static/media, so the
// CSP's font-src 'self' holds and no request ever leaves for Google.
//
// Jost is the variable file: body, labels and buttons use four weights of it.
// Playfair Display is asked for 700 alone, which keeps it to one small file;
// every heading uses that weight.
const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: "700",
  display: "swap",
  variable: "--font-playfair",
});

// metadataBase only resolves relative Open Graph URLs, so the localhost
// fallback is harmless here. The value that must never be wrong — the host
// inside the QR — is guarded in lib/qr.ts instead.
const metadataBaseUrl = siteUrl();

// The brand, not the event: pages that know the event set their own title
// through generateMetadata, and this template appends the presenter to it.
const description = `Your invitation from ${BRAND.presenter}. Register once and your QR ticket is ready right away.`;

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: BRAND.presenter,
    template: `%s · ${BRAND.presenter}`,
  },
  description,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: BRAND.presenter,
    title: BRAND.presenter,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom stays available: docs/05-UX-FLOWS.md section 6 requires the page to
  // still work at 200%.
  maximumScale: 5,
  // Keep in step with --canvas in globals.css.
  themeColor: "#f4eee0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    // Everything a participant reads is in English (DESIGN.md section 5).
    // Staff and admin pages that stay in Indonesian mark their own <main>
    // with lang="id".
    <html
      lang="en"
      className={`${jost.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
