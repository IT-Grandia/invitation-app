import { config } from 'dotenv'
import { eq, like } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { assertLocalDatabase } from '../../lib/db/local-only'
import { events } from '../../lib/db/schema'
import { E2E_EVENT, E2E_SLUG_PREFIX } from './event'

config({ path: '.env.local' })

export default async function globalSetup() {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  // The suite inserts and deletes events.
  assertLocalDatabase(url, 'run end-to-end tests')

  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client)

  // A run that was killed leaves its event behind, and it would stay the one on show.
  await db.delete(events).where(like(events.slug, `${E2E_SLUG_PREFIX}%`))

  const [event] = await db
    .insert(events)
    .values({ ...E2E_EVENT, slug: `${E2E_SLUG_PREFIX}${Date.now()}` })
    .returning({ id: events.id })

  // Registrations go with the event through the foreign key cascade.
  return async () => {
    await db.delete(events).where(eq(events.id, event.id))
    await client.end()
  }
}
