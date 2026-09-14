import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// The one web font in the project (DESIGN.md section 2). next/font downloads
// it at build time and serves it from /_next/static/media, so the CSP's
// font-src 'self' holds and no request ever leaves for Google.
//
// Two loaders instead of one: a single call with both styles would fetch and
// preload the italic of every weight, and only the 500 italic is ever used
// (tagline, appreciation line). Keeping it in its own family, without preload,
// means it is fetched only by pages that actually render it.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: "normal",
  display: "swap",
  variable: "--font-cormorant",
});

const cormorantItalic = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "500",
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-cormorant-italic",
});

// metadataBase only resolves relative Open Graph URLs, so the localhost
// fallback is harmless here. The value that must never be wrong — the host
// inside the QR — is guarded in lib/qr.ts instead.
const metadataBaseUrl = siteUrl();

// The brand, not the event: pages that know the event set their own title
// through generateMetadata, and this template appends the lockup to it.
const description = `Your invitation from ${BRAND.lockup}. Register once and your QR ticket is ready right away.`;

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: BRAND.lockup,
    template: `%s · ${BRAND.lockup}`,
  },
  description,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: BRAND.lockup,
    title: BRAND.lockup,
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
  themeColor: "#f3efe4",
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
      className={`${cormorant.variable} ${cormorantItalic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
