import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    venueName: text('venue_name').notNull(),
    venueAddress: text('venue_address'),
    venueMapUrl: text('venue_map_url'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }).notNull(),
    // Null means unlimited, which skips the locking path in the registration transaction.
    capacity: integer('capacity'),
    status: text('status').notNull().default('draft'),
    contactWhatsapp: text('contact_whatsapp'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'events_status_valid',
      sql`${table.status} in ('draft', 'published', 'closed', 'archived')`,
    ),
    check('events_capacity_positive', sql`${table.capacity} is null or ${table.capacity} > 0`),
    check('events_time_order', sql`${table.endsAt} > ${table.startsAt}`),
  ],
)

export const registrations = pgTable(
  'registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    notes: text('notes'),
    status: text('status').notNull().default('confirmed'),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    checkedInBy: text('checked_in_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ipHash: text('ip_hash'),
    // Row number in the mirrored spreadsheet, so check-in updates one cell
    // instead of scanning the sheet.
    sheetRow: integer('sheet_row'),
    sheetSyncedAt: timestamp('sheet_synced_at', { withTimezone: true }),
  },
  (table) => [
    // Cancelled registrations release the number so the same person can sign up again.
    uniqueIndex('registrations_event_phone_uniq')
      .on(table.eventId, table.phone)
      .where(sql`${table.status} <> 'cancelled'`),
    index('registrations_event_idx').on(table.eventId, table.createdAt.desc()),
    index('registrations_status_idx').on(table.eventId, table.status),
    index('registrations_unsynced_idx')
      .on(table.sheetSyncedAt)
      .where(sql`${table.sheetSyncedAt} is null`),
    check(
      'registrations_status_valid',
      sql`${table.status} in ('confirmed', 'waitlist', 'cancelled')`,
    ),
    check('registrations_name_length', sql`char_length(${table.fullName}) between 3 and 80`),
    // Stored in E.164 without the plus sign, normalised before every write.
    check('registrations_phone_format', sql`${table.phone} ~ '^62[0-9]{8,13}$'`),
    check(
      'registrations_notes_length',
      sql`${table.notes} is null or char_length(${table.notes}) <= 300`,
    ),
  ],
)

export const checkInLogs = pgTable(
  'check_in_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Null for tokens that match no registration, which are still worth recording.
    registrationId: uuid('registration_id').references(() => registrations.id, {
      onDelete: 'set null',
    }),
    rawToken: text('raw_token').notNull(),
    result: text('result').notNull(),
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull().defaultNow(),
    // Differs from scannedAt for scans queued offline and synced later.
    clientScannedAt: timestamp('client_scanned_at', { withTimezone: true }),
    staffLabel: text('staff_label'),
    deviceInfo: text('device_info'),
    syncedOffline: boolean('synced_offline').notNull().default(false),
  },
  (table) => [
    index('check_in_logs_reg_idx').on(table.registrationId, table.scannedAt.desc()),
    index('check_in_logs_time_idx').on(table.scannedAt.desc()),
    check(
      'check_in_logs_result_valid',
      sql`${table.result} in ('ok', 'already_used', 'not_found', 'cancelled', 'wrong_event')`,
    ),
  ],
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Registration = typeof registrations.$inferSelect
export type NewRegistration = typeof registrations.$inferInsert
export type CheckInLog = typeof checkInLogs.$inferSelect
export type NewCheckInLog = typeof checkInLogs.$inferInsert
