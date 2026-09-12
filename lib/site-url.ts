/**
 * The one place NEXT_PUBLIC_SITE_URL is read.
 *
 * Two traps this exists to close. First, `??` treats an empty string as set:
 * a Vercel variable left blank sailed through to `new URL('')` and broke the
 * build. Second, four files each had their own fallback, so a fix in one
 * place did not reach the others.
 *
 * The value matters more than most: it is the host inside every QR code, and
 * a QR that has been saved to a participant's photos cannot be reissued
 * (docs/01-PRD.md section 10.1). Callers that put it into a ticket URL should
 * refuse to run in production without it — see ticketUrl() in lib/qr.ts.
 */

const DEVELOPMENT_FALLBACK = 'http://localhost:3000'

/** True when the variable is present and not just whitespace. */
export function isSiteUrlConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim())
}

/**
 * The site origin without a trailing slash. Falls back to localhost when
 * unset or blank, which is the right answer for development, tests, and CI —
 * and a loud wrong answer anywhere else, so production callers should check
 * isSiteUrlConfigured() first when the value ends up in a QR.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  return (configured || DEVELOPMENT_FALLBACK).replace(/\/+$/, '')
}
