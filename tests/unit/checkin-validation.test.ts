import { describe, expect, it } from 'vitest'

import { BATCH_MAX_ITEMS, batchCheckInRequestSchema } from '@/lib/validation/checkin'

const item = { token: 'SEEDA0000000000000000000', clientScannedAt: '2026-09-26T01:03:22.000Z' }

describe('batchCheckInRequestSchema', () => {
  it('accepts a queue within the limit', () => {
    expect(batchCheckInRequestSchema.safeParse({ items: [item] }).success).toBe(true)
  })

  it('accepts a label on each item as well as for the whole batch', () => {
    const body = { staffLabel: 'Gate A', items: [{ ...item, staffLabel: 'Gate B' }] }

    expect(batchCheckInRequestSchema.safeParse(body).success).toBe(true)
  })

  it.each([
    ['an empty queue', { items: [] }],
    ['a queue over the limit', { items: Array.from({ length: BATCH_MAX_ITEMS + 1 }, () => item) }],
    ['an item without a scan time', { items: [{ token: item.token }] }],
    ['a scan time that is not ISO 8601', { items: [{ ...item, clientScannedAt: '26/09/2026 08:03' }] }],
    ['a label over 80 characters', { staffLabel: 'x'.repeat(81), items: [item] }],
  ])('rejects %s', (_label, body) => {
    expect(batchCheckInRequestSchema.safeParse(body).success).toBe(false)
  })
})
