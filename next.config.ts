import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Not on any page yet: the registration form still sends a placeholder token.
// Allowing it now keeps the widget from being blocked the day it is added.
const turnstile = "https://challenges.cloudflare.com";

// Set without nonces so pages keep rendering statically. The cost is
// 'unsafe-inline' for scripts, which Next.js needs for its inline hydration
// data; every other source is limited to this origin. 'unsafe-eval' is for
// development only, where React uses it to rebuild server error stacks.
// upgrade-insecure-requests is left out: HSTS already covers production, and the
// directive upgrades every http request, including those of a production build
// run over plain http on a laptop.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${turnstile}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self'",
  `frame-src ${turnstile}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // No preload: joining the browser preload list is hard to undo, and the final
  // domain has not been chosen yet.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ticket URLs carry the participant's token in the path. Links that leave the
  // site, such as Maps or WhatsApp from a ticket, then send only the origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The scanner needs the camera on this origin; embedded frames get none.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

// Kept out of search with a header rather than robots.txt, so a crawler that
// reaches one of these URLs reads the noindex instead of skipping the page.
const privatePages = ["/t/:path*", "/scan", "/admin", "/admin/:path*"];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      ...privatePages.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};

export default nextConfig;
