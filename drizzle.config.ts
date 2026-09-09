import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!url) {
  throw new Error('Neither DIRECT_URL nor DATABASE_URL is set')
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // Migrations run over a direct connection; Supabase's pooler rejects some DDL.
  dbCredentials: { url },
})
