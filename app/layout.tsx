import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import { resolveTheme } from "@/lib/theme";
import "./globals.css";

// Display face for the hero and section headings. Geometric and friendly —
// this is an invitation to a community match, not a tournament bracket.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

// Body face. Designed for Indonesian text and stays legible at small sizes on
// the mid-range Android screens that make up most of our traffic.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
    { media: "(prefers-color-scheme: light)", color: "#fff8f1" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Opts this render out of prerendering. Without it Next would bake the theme
  // in at build time and every visitor would get whatever palette was current
  // when the deploy ran. Nothing is lost: every participant-facing page in this
  // app is already dynamic (docs/02-ARCHITECTURE.md section 7.3).
  await connection();

  return (
    <html
      lang="id"
      data-theme={resolveTheme()}
      className={`${outfit.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
