import { buildClearTicketCookieHeader } from '@/lib/ticket-cookie'

export const dynamic = 'force-dynamic'

export async function POST() {
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: {
        'Set-Cookie': buildClearTicketCookieHeader(),
        'Cache-Control': 'no-store',
      },
    },
  )
}
