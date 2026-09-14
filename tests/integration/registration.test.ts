import { eq, sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST as registerHandler } from '@/app/api/register/route'
import { db } from '@/lib/db'
import {
  cancelRegistration,
  findRegistrationByToken,
  getUnsyncedRegistrations,
  markRegistrationSheetSynced,
} from '@/lib/db/queries/registrations'
import { events, registrations } from '@/lib/db/schema'
import { resetRateLimit } from '@/lib/rate-limit'
import { sheets } from '@/lib/sheets'

let eventId: string
const runId = Math.floor(Math.random() * 89999 + 10000)
let phoneCounter = 0
const createdTokens: string[] = []

function nextPhone(): string {
  phoneCounter += 1
  return `0857${runId}${String(phoneCounter).padStart(3, '0')}`
}

async function createTestEvent(overrides: Partial<typeof events.$inferInsert> = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const [event] = await db
    .insert(events)
    .values({
      slug: `test-event-${suffix}`,
      name: 'Padel Day Test',
      venueName: 'Arena Jakarta',
      startsAt: new Date('2026-09-26T01:00:00.000Z'),
      endsAt: new Date('2026-09-26T10:00:00.000Z'),
      registrationOpensAt: new Date(Date.now() - 3600_000), // 1 hour ago
      registrationClosesAt: new Date(Date.now() + 86400_000), // tomorrow
      status: 'published',
      capacity: null, // default unlimited
      ...overrides,
    })
    .returning()

  return event
}

function createRequest(
  body: unknown,
  targetEventId?: string,
  clientIp = '192.168.1.100',
): Request {
  const url = targetEventId
    ? `http://localhost:3000/api/register?eventId=${targetEventId}`
    : 'http://localhost:3000/api/register'

  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': clientIp,
    },
    body: JSON.stringify(body),
  })
}

beforeEach(async () => {
  resetRateLimit()
  vi.spyOn(sheets, 'appendRegistration').mockResolvedValue({ sheetRow: 2 })
  const event = await createTestEvent()
  eventId = event.id
})

afterEach(async () => {
  vi.restoreAllMocks()
  resetRateLimit()
  for (const token of createdTokens) {
    await db.delete(registrations).where(eq(registrations.token, token))
  }
  createdTokens.length = 0

  if (eventId) {
    await db.delete(events).where(eq(events.id, eventId))
  }
})

describe('POST /api/register Integration Tests', () => {
  it('registers participant successfully, sets HttpOnly cookie, and returns ticket payload', async () => {
    const phone = nextPhone()
    const payload = {
      fullName: 'Budi Santoso',
      phone,
      email: 'budi@example.com',
      notes: 'First time playing padel',
      consent: true,
      turnstileToken: 'test-turnstile-token',
    }

    const res = await registerHandler(createRequest(payload, eventId))
    expect(res.status).toBe(201)

    // Check Set-Cookie
    const cookieHeader = res.headers.get('set-cookie')
    expect(cookieHeader).toBeDefined()
    expect(cookieHeader).toContain('padel_ticket=')
    expect(cookieHeader).toMatch(/HttpOnly/i)
    expect(cookieHeader).toMatch(/Secure/i)
    expect(cookieHeader).toMatch(/SameSite=Lax/i)

    const data = await res.json()
    expect(data.token).toHaveLength(24)
    expect(data.ticketNumber).toBe(data.token.slice(0, 8).toUpperCase())
    expect(data.ticketUrl).toContain(`/t/${data.token}`)
    expect(data.registration).toEqual({
      fullName: 'Budi Santoso',
      eventName: 'Padel Day Test',
      startsAt: '2026-09-26T01:00:00.000Z',
      status: 'confirmed',
    })

    // Verify row persisted in database
    const saved = await findRegistrationByToken(data.token)
    expect(saved).not.toBeNull()
    expect(saved?.fullName).toBe('Budi Santoso')
    expect(saved?.phone).toBe(`62${phone.slice(1)}`)
    expect(saved?.email).toBe('budi@example.com')
    expect(saved?.notes).toBe('First time playing padel')
    expect(saved?.status).toBe('confirmed')
  })

  it('registers participant with survey answers (community, investmentInterests, attending) and persists them in database', async () => {
    const phone = nextPhone()
    const payload = {
      fullName: 'Siti Rahmawati',
      phone,
      community: 'Club 79',
      investmentInterests: ['Gold', 'Deposito'],
      attending: 'yes',
      consent: true,
      turnstileToken: 'test-turnstile-token',
    }

    const res = await registerHandler(createRequest(payload, eventId))
    expect(res.status).toBe(201)

    const data = await res.json()
    if (data.token) {
      createdTokens.push(data.token)
    }

    const saved = await findRegistrationByToken(data.token)
    expect(saved).not.toBeNull()
    expect(saved?.fullName).toBe('Siti Rahmawati')
    expect(saved?.community).toBe('club_79')
    expect(saved?.investmentInterests).toEqual(['gold', 'deposit'])
    expect(saved?.attending).toBe(true)
  })

  it('registers non-attending participant (attending: "no"), generates token and persists data', async () => {
    const phone = nextPhone()
    const payload = {
      fullName: 'Rian Pratama',
      phone,
      community: 'Womenpreneur Hipmi Jateng',
      investmentInterests: ['Stocks', 'Property'],
      attending: 'no',
      consent: true,
      turnstileToken: 'test-turnstile-token',
    }

    const res = await registerHandler(createRequest(payload, eventId))
    expect(res.status).toBe(201)

    const data = await res.json()
    if (data.token) {
      createdTokens.push(data.token)
    }

    expect(data.token).toHaveLength(24)
    expect(data.ticketNumber).toBe(data.token.slice(0, 8).toUpperCase())

    const saved = await findRegistrationByToken(data.token)
    expect(saved).not.toBeNull()
    expect(saved?.fullName).toBe('Rian Pratama')
    expect(saved?.community).toBe('womenpreneur_hipmi_jateng')
    expect(saved?.investmentInterests).toEqual(['stocks', 'property'])
    expect(saved?.attending).toBe(false)
  })

  it('registers successfully with default published event when eventId is omitted', async () => {
    const phone = nextPhone()
    const res = await registerHandler(
      createRequest({
        fullName: 'Peserta Default Event',
        phone,
        consent: true,
        turnstileToken: 'test-token',
      }),
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    if (data.token) {
      createdTokens.push(data.token)
    }
    expect(data.registration.status).toBe('confirmed')
  })

  it('🔴 rejects duplicate phone numbers with 409 WITHOUT leaking existing ticket or name', async () => {
    const phone = nextPhone()
    const firstPayload = {
      fullName: 'Budi Santoso',
      phone,
      consent: true,
      turnstileToken: 'token-1',
    }

    const firstRes = await registerHandler(createRequest(firstPayload, eventId))
    expect(firstRes.status).toBe(201)
    const firstData = await firstRes.json()

    // Second registration attempt with the same phone in a different variant (+62...)
    const secondPayload = {
      fullName: 'Penyerang Akun',
      phone: `+62${phone.slice(1)}`,
      consent: true,
      turnstileToken: 'token-2',
    }

    const secondRes = await registerHandler(createRequest(secondPayload, eventId))
    expect(secondRes.status).toBe(409)

    const rawBody = await secondRes.text()
    const parsedBody = JSON.parse(rawBody)

    expect(parsedBody.error.code).toBe('PHONE_ALREADY_REGISTERED')
    expect(parsedBody.error.message).toContain('Nomor ini sudah terdaftar')

    // 🔴 Security assertion: body must NOT leak token, name, or ticket URL
    expect(rawBody).not.toContain(firstData.token)
    expect(rawBody).not.toContain('Budi Santoso')
    expect(rawBody).not.toContain('ticketUrl')
    expect(rawBody).not.toContain('ticketNumber')
  })

  it('releases phone number so participant can register again after cancellation', async () => {
    const phone = nextPhone()
    const firstRes = await registerHandler(
      createRequest(
        {
          fullName: 'Budi Santoso',
          phone,
          consent: true,
          turnstileToken: 'token-1',
        },
        eventId,
      ),
    )
    expect(firstRes.status).toBe(201)
    const firstData = await firstRes.json()

    // Cancel registration
    const row = await findRegistrationByToken(firstData.token)
    expect(row).not.toBeNull()
    await cancelRegistration(row!.id)

    // Re-register with the same phone
    const reRes = await registerHandler(
      createRequest(
        {
          fullName: 'Budi Santoso Baru',
          phone,
          consent: true,
          turnstileToken: 'token-2',
        },
        eventId,
      ),
    )
    expect(reRes.status).toBe(201)
    const reData = await reRes.json()
    expect(reData.token).not.toBe(firstData.token)
  })

  it('🔴 enforces capacity in concurrent registrations (20 requests with capacity 5 -> exactly 5 succeed)', async () => {
    // Update event capacity to 5
    await db.update(events).set({ capacity: 5 }).where(eq(events.id, eventId))

    // Warm up DB connection pool so requests race genuinely
    await Promise.all(Array.from({ length: 5 }, () => db.select().from(events).where(eq(events.id, eventId))))

    const requests = Array.from({ length: 20 }, (_, i) => {
      const phone = `0819${String(i + 1).padStart(8, '0')}`
      return registerHandler(
        createRequest(
          {
            fullName: `Peserta Kuota ${i + 1}`,
            phone,
            consent: true,
            turnstileToken: `token-${i + 1}`,
          },
          eventId,
          `192.168.10.${i + 1}`,
        ),
      )
    })

    const responses = await Promise.all(requests)
    const successResponses = responses.filter((r) => r.status === 201)
    const fullResponses = responses.filter((r) => r.status === 409)

    expect(successResponses).toHaveLength(5)
    expect(fullResponses).toHaveLength(15)

    // Verify error format of the full responses
    for (const res of fullResponses) {
      const body = await res.json()
      expect(body.error.code).toBe('EVENT_FULL')
    }

    // Verify DB count
    const [countRow] = await db
      .select({
        count: sql<number>`count(*) filter (where ${registrations.status} = 'confirmed')`.mapWith(Number),
      })
      .from(registrations)
      .where(eq(registrations.eventId, eventId))

    expect(countRow.count).toBe(5)
  }, 20000)

  it('allows all registrations when capacity is NULL (unlimited)', async () => {
    // Event capacity is null by default in beforeEach
    const requests = Array.from({ length: 10 }, (_, i) => {
      const phone = `0821${String(i + 1).padStart(8, '0')}`
      return registerHandler(
        createRequest(
          {
            fullName: `Peserta Unlimited ${i + 1}`,
            phone,
            consent: true,
            turnstileToken: `token-${i + 1}`,
          },
          eventId,
          `192.168.20.${i + 1}`,
        ),
      )
    })

    const responses = await Promise.all(requests)
    const successResponses = responses.filter((r) => r.status === 201)
    expect(successResponses).toHaveLength(10)
  })

  it('rejects registration when registration window is not open or closed', async () => {
    // Closed event
    await db
      .update(events)
      .set({
        registrationClosesAt: new Date(Date.now() - 3600_000), // 1 hour ago
      })
      .where(eq(events.id, eventId))

    const res = await registerHandler(
      createRequest(
        {
          fullName: 'Budi Santoso',
          phone: nextPhone(),
          consent: true,
          turnstileToken: 'token-1',
        },
        eventId,
      ),
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('REGISTRATION_CLOSED')
  })

  it('rejects invalid payload with 400 VALIDATION_ERROR', async () => {
    const res = await registerHandler(
      createRequest(
        {
          fullName: 'Ab', // too short (<3)
          phone: '0211234567', // landline, invalid
          consent: false,
        },
        eventId,
      ),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toBeDefined()
  })

  it('enforces rate limit of 5 requests per 10 minutes per IP hash and responds with 429 RATE_LIMITED', async () => {
    const testIp = '203.0.113.42'

    // First 5 attempts from this IP should pass the rate limit check
    for (let i = 0; i < 5; i++) {
      const phone = nextPhone()
      const payload = {
        fullName: `Peserta ${i + 1}`,
        phone,
        consent: true,
        turnstileToken: `token-${i}`,
      }
      const res = await registerHandler(createRequest(payload, eventId, testIp))
      expect(res.status).toBe(201)
      const data = await res.json()
      createdTokens.push(data.token)
    }

    // 6th attempt from the SAME IP should be blocked by rate limit
    const payload6 = {
      fullName: 'Peserta Keenam',
      phone: nextPhone(),
      consent: true,
      turnstileToken: 'token-6',
    }
    const blockedRes = await registerHandler(createRequest(payload6, eventId, testIp))
    expect(blockedRes.status).toBe(429)

    const blockedBody = await blockedRes.json()
    expect(blockedBody.error.code).toBe('RATE_LIMITED')
    expect(blockedRes.headers.get('retry-after')).toBeDefined()
    expect(Number(blockedRes.headers.get('retry-after'))).toBeGreaterThan(0)

    // A request from a DIFFERENT IP should not be blocked
    const differentIpRes = await registerHandler(
      createRequest(payload6, eventId, '203.0.113.99'),
    )
    expect(differentIpRes.status).toBe(201)
    const diffData = await differentIpRes.json()
    createdTokens.push(diffData.token)
  })

  it('rejects registration with 400 TURNSTILE_FAILED when Turnstile verification fails', async () => {
    const originalSecret = process.env.TURNSTILE_SECRET_KEY
    process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key'

    try {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

      const payload = {
        fullName: 'Bot User',
        phone: nextPhone(),
        consent: true,
        turnstileToken: 'fake-token',
      }

      const res = await registerHandler(createRequest(payload, eventId))
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error.code).toBe('TURNSTILE_FAILED')
    } finally {
      process.env.TURNSTILE_SECRET_KEY = originalSecret
    }
  })

  it('updates registration with sheet_row and sheet_synced_at via markRegistrationSheetSynced query', async () => {
    const payload = {
      fullName: 'Peserta Test Query',
      phone: nextPhone(),
      consent: true,
      turnstileToken: 'token-query',
    }

    const res = await registerHandler(createRequest(payload, eventId))
    expect(res.status).toBe(201)
    const data = await res.json()
    createdTokens.push(data.token)

    const initial = await findRegistrationByToken(data.token)
    expect(initial).not.toBeNull()

    const updated = await markRegistrationSheetSynced(initial!.id, 77)
    expect(updated).not.toBeNull()
    expect(updated?.sheetRow).toBe(77)
    expect(updated?.sheetSyncedAt).toBeInstanceOf(Date)
  })

  it('appends row to Google Sheets and stores sheet_row and sheet_synced_at in DB upon registration', async () => {
    const appendSpy = vi.spyOn(sheets, 'appendRegistration').mockResolvedValue({ sheetRow: 88 })

    const payload = {
      fullName: 'Peserta Sinkron Sheets',
      phone: nextPhone(),
      consent: true,
      turnstileToken: 'valid-token',
    }

    const res = await registerHandler(createRequest(payload, eventId))
    expect(res.status).toBe(201)

    const data = await res.json()
    createdTokens.push(data.token)

    expect(appendSpy).toHaveBeenCalledTimes(1)
    expect(appendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Peserta Sinkron Sheets',
        token: data.token,
      }),
    )

    const stored = await findRegistrationByToken(data.token)
    expect(stored).not.toBeNull()
    expect(stored?.sheetRow).toBe(88)
    expect(stored?.sheetSyncedAt).not.toBeNull()

    appendSpy.mockRestore()
  })

  it('tetap berhasil mendaftar saat Sheets API error (quota exceeded, timeout, dll.)', async () => {
    const appendSpy = vi
      .spyOn(sheets, 'appendRegistration')
      .mockRejectedValue(new Error('quota exceeded'))

    const payload = {
      fullName: 'Peserta Tahan Error Sheets',
      phone: nextPhone(),
      consent: true,
      turnstileToken: 'valid-token',
    }

    const res = await registerHandler(createRequest(payload, eventId))
    expect(res.status).toBe(201)

    const data = await res.json()
    createdTokens.push(data.token)

    expect(data.token).toBeDefined()
    expect(data.ticketUrl).toBeDefined()

    // Database record is intact and marked as unsynced
    const stored = await findRegistrationByToken(data.token)
    expect(stored).not.toBeNull()
    expect(stored?.status).toBe('confirmed')
    expect(stored?.sheetSyncedAt).toBeNull()
    expect(stored?.sheetRow).toBeNull()

    // Appears in getUnsyncedRegistrations query
    const unsynced = await getUnsyncedRegistrations(100)
    expect(unsynced.some((r) => r.token === data.token)).toBe(true)

    appendSpy.mockRestore()
  })

  it('mengambil baris belum tersinkron dan mengecualikan pendaftaran batal', async () => {
    const appendSpy = vi
      .spyOn(sheets, 'appendRegistration')
      .mockRejectedValue(new Error('sheets offline'))

    const phone = nextPhone()
    const payload = {
      fullName: 'Peserta Akan Batal',
      phone,
      consent: true,
      turnstileToken: 'valid-token',
    }

    const res = await registerHandler(createRequest(payload, eventId))
    expect(res.status).toBe(201)
    const data = await res.json()
    createdTokens.push(data.token)

    const reg = await findRegistrationByToken(data.token)
    expect(reg).not.toBeNull()

    // Cancel this registration
    await cancelRegistration(reg!.id)

    // Should not appear in getUnsyncedRegistrations because status is cancelled
    const unsynced = await getUnsyncedRegistrations(100)
    expect(unsynced.some((r) => r.id === reg!.id)).toBe(false)

    appendSpy.mockRestore()
  })
})
