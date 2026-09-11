import type { MetadataRoute } from 'next'

// Ticket, scanner and admin pages are kept out of search by an X-Robots-Tag
// header in next.config.ts instead of being listed here. A disallow rule stops a
// crawler reading the page, so it never sees the noindex and can still index a
// ticket URL shared elsewhere, token included. Listing them would also advertise
// where the admin page lives.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
  }
}
