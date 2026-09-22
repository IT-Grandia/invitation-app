import { config } from 'dotenv'
import { eq, like } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { events } from '../../lib/db/schema'
import { E2E_EVENT, E2E_SLUG_PREFIX } from './event'

config({ path: '.env.local' })

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

export default async function globalSetup() {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  // The suite inserts and deletes events, so it only ever runs against a
  // database on this machine.
  const { hostname } = new URL(url)
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to run end-to-end tests against ${hostname}`)
  }

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
