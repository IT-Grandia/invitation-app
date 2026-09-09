import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

// Supabase routes connections through pgBouncer in transaction mode, which does
// not support prepared statements. Setting this here keeps the same client
// working against both the local container and production.
const createClient = () => postgres(connectionString, { prepare: false })

// Next.js recreates modules on every hot reload in development, which would open
// a new pool each time until Postgres refuses further connections.
const globalForDb = globalThis as unknown as { dbClient?: ReturnType<typeof createClient> }

const client = globalForDb.dbClient ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbClient = client
}

export const db = drizzle(client)
