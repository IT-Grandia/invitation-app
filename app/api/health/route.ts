import { sql } from 'drizzle-orm'

import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Also the target of the daily cron that keeps the Supabase free tier project
// from being paused for inactivity.
export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    await db.execute(sql`select 1`)
    return Response.json({ status: 'ok', db: 'ok', timestamp })
  } catch {
    // The reason stays in the server logs; the response says nothing about the
    // infrastructure behind it.
    return Response.json({ status: 'error', db: 'error', timestamp }, { status: 503 })
  }
}
