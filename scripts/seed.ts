import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '../lib/db/schema'
import { checkInLogs, events, registrations } from '../lib/db/schema'

config({ path: '.env.local' })

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed a production database')
}

const url = process.env.DATABASE_URL

if (!url) {
  throw new Error('DATABASE_URL is not set')
}

const TOKEN_LENGTH = 24
const TOKEN_PREFIX = 'SEEDTOKEN'

// Predictable tokens let the ticket page and the scanner be developed against
// stable URLs that survive a database reset. Padded to the same length as the
// tokens the application generates so nothing depends on seed data being shorter.
const seedToken = (suffix: string) =>
  TOKEN_PREFIX + '0'.repeat(TOKEN_LENGTH - TOKEN_PREFIX.length - suffix.length) + suffix

async function main() {
  const client = postgres(url!, { prepare: false })
  const db = drizzle(client, { schema })

  try {
    await db.delete(checkInLogs)
    await db.delete(registrations)
    await db.delete(events)

    const [event] = await db
      .insert(events)
      .values({
        slug: 'padel-day-2026',
        name: 'Padel Day 2026',
        description: 'Fun match padel terbuka untuk semua level.',
        venueName: 'TBA',
        venueAddress: 'TBA',
        startsAt: new Date('2026-09-26T01:00:00.000Z'),
        endsAt: new Date('2026-09-26T10:00:00.000Z'),
        registrationOpensAt: new Date('2026-09-09T00:00:00.000Z'),
        registrationClosesAt: new Date('2026-09-25T14:00:00.000Z'),
        capacity: null,
        status: 'published',
        contactWhatsapp: '628123456789',
      })
      .returning()

    const rows = await db
      .insert(registrations)
      .values([
        {
          eventId: event.id,
          token: seedToken('A'),
          fullName: 'Budi Santoso',
          phone: '628123456701',
          email: 'budi@example.com',
          status: 'confirmed',
        },
        {
          eventId: event.id,
          token: seedToken('B'),
          fullName: 'Siti Aminah',
          phone: '628123456702',
          status: 'confirmed',
        },
        {
          eventId: event.id,
          token: seedToken('C'),
          fullName: 'Andi Wijaya',
          phone: '628123456703',
          status: 'confirmed',
          checkedInAt: new Date('2026-09-26T01:05:00.000Z'),
          checkedInBy: 'Gate A',
        },
        {
          eventId: event.id,
          token: seedToken('D'),
          fullName: 'Rina Lestari',
          phone: '628123456704',
          status: 'confirmed',
          checkedInAt: new Date('2026-09-26T01:12:00.000Z'),
          checkedInBy: 'Gate A',
        },
        {
          eventId: event.id,
          token: seedToken('E'),
          fullName: 'Dimas Prakoso',
          phone: '628123456705',
          status: 'cancelled',
        },
      ])
      .returning()

    const attended = rows.filter((row) => row.checkedInAt !== null)

    await db.insert(checkInLogs).values(
      attended.map((row) => ({
        registrationId: row.id,
        rawToken: row.token,
        result: 'ok',
        scannedAt: row.checkedInAt!,
        staffLabel: row.checkedInBy,
      })),
    )

    console.log(`Seeded event "${event.name}" with ${rows.length} registrations\n`)
    for (const row of rows) {
      const state = row.status === 'cancelled'
        ? 'cancelled'
        : row.checkedInAt
          ? 'checked in'
          : 'not checked in'
      console.log(`  /t/${row.token}  ${row.fullName.padEnd(16)} ${state}`)
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
