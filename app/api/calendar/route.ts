import { getPublishedEvent } from '@/lib/db/queries/event'
import { buildIcs } from '@/lib/ics'

/**
 * GET /api/calendar — the event as an .ics file, for the "Tambah ke kalender"
 * button on the ticket.
 *
 * A real URL rather than a data: link on purpose: iOS Safari only offers its
 * "Add to Calendar" sheet for a text/calendar response it navigated to, and
 * ignores the download attribute on data URLs. Carries no participant data,
 * so it needs no token and can sit in a cache for a while.
 */
export async function GET() {
  const event = await getPublishedEvent()

  if (!event) {
    return new Response(null, { status: 404 })
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  const location =
    event.venueAddress && event.venueAddress !== event.venueName
      ? `${event.venueName}, ${event.venueAddress}`
      : event.venueName

  const ics = buildIcs({
    uid: `${event.id}@${new URL(siteUrl).host}`,
    summary: event.name,
    location,
    description: `Tiket dan detail acara: ${siteUrl}`,
    url: siteUrl,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
  })

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
