import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { assertLocalDatabase } from '../lib/db/local-only'
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

assertLocalDatabase(url, 'seed')

const TOKEN_LENGTH = 24
const TOKEN_PREFIX = 'SEED'

// Predictable tokens let the ticket page and the scanner be developed against
// stable URLs that survive a database reset. The distinguishing letter sits
// within the first eight characters so seeded tickets do not all render the same
// ticket number. Padded to the length the application generates, so nothing can
// come to depend on seed tokens being shorter than real ones.
const seedToken = (suffix: string) =>
  TOKEN_PREFIX + suffix + '0'.repeat(TOKEN_LENGTH - TOKEN_PREFIX.length - suffix.length)

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
        name: 'FA Live Padel Society',
        description: 'Fun match padel terbuka untuk semua level.',
        venueName: 'Padel Ground, Semarang',
        venueAddress: 'TBA',
        venueMapUrl: 'https://maps.app.goo.gl/CK3wvJjnjSMQmDNW7',
        startsAt: new Date('2026-09-26T01:00:00.000Z'),
        endsAt: new Date('2026-09-26T10:00:00.000Z'),
        registrationOpensAt: new Date('2026-09-09T00:00:00.000Z'),
        registrationClosesAt: new Date('2026-09-25T14:00:00.000Z'),
        capacity: null,
        status: 'published',
        contactWhatsapp: '628123456789',
        details: [
          {
            label: 'Format',
            value: 'Main santai dengan rotasi pasangan. Bukan turnamen, tidak ada babak gugur.',
          },
          {
            label: 'Level',
            value: 'Terbuka untuk semua. Belum pernah main padel sama sekali juga boleh ikut.',
          },
          {
            label: 'Bawa apa',
            value:
              'Sepatu non-marking, botol minum, dan handuk kecil. Raket ada pinjaman kalau kamu belum punya.',
          },
          {
            label: 'Dress code',
            value: 'Baju olahraga bebas. Yang penting nyaman buat gerak.',
          },
        ],
        rundown: [
          { time: '08.00', activity: 'Registrasi ulang dan scan tiket' },
          { time: '08.30', activity: 'Pemanasan bersama' },
          { time: '09.00', activity: 'Sesi main dimulai' },
          { time: '12.00', activity: 'Istirahat dan makan siang' },
          { time: '13.00', activity: 'Sesi main lanjut' },
          { time: '16.30', activity: 'Foto bersama' },
          { time: '17.00', activity: 'Selesai' },
        ],
      })
      .returning()

    const rows = await db
      .insert(registrations)
      .values([
        {
          eventId: event.id,
          token: seedToken('A'),
          community: 'club_79',
          investmentInterests: ['property', 'stocks'],
          fullName: 'Budi Santoso',
          phone: '628123456701',
          email: 'budi@example.com',
          status: 'confirmed',
        },
        {
          eventId: event.id,
          token: seedToken('B'),
          community: 'womenpreneur_hipmi_jateng',
          investmentInterests: ['gold'],
          attending: false,
          fullName: 'Siti Aminah',
          phone: '628123456702',
          status: 'confirmed',
        },
        {
          eventId: event.id,
          token: seedToken('C'),
          community: 'club_79',
          investmentInterests: ['deposit', 'property'],
          fullName: 'Andi Wijaya',
          phone: '628123456703',
          status: 'confirmed',
          checkedInAt: new Date('2026-09-26T01:05:00.000Z'),
          checkedInBy: 'Gate A',
        },
        {
          eventId: event.id,
          token: seedToken('D'),
          community: 'womenpreneur_hipmi_jateng',
          investmentInterests: ['stocks'],
          fullName: 'Rina Lestari',
          phone: '628123456704',
          status: 'confirmed',
          checkedInAt: new Date('2026-09-26T01:12:00.000Z'),
          checkedInBy: 'Gate A',
        },
        {
          eventId: event.id,
          token: seedToken('E'),
          community: 'club_79',
          investmentInterests: ['gold'],
          attending: false,
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
