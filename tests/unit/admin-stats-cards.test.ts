import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminStatsCards } from '@/components/admin/AdminStatsCards'
import type { AdminStatsResponse } from '@/components/admin/types'

describe('AdminStatsCards component', () => {
  const baseStats: AdminStatsResponse = {
    event: {
      name: 'Padel Day 2026',
      status: 'published',
      startsAt: '2026-09-26T01:00:00.000Z',
      capacity: null,
    },
    totals: {
      registered: 48,
      checkedIn: 24,
      notCheckedIn: 24,
      waitlist: 0,
      cancelled: 0,
      remaining: null,
    },
    sheetSync: {
      pending: 0,
      lastSyncedAt: '2026-09-26T00:50:00.000Z',
    },
    lastCheckIn: {
      checkedInAt: '2026-09-26T01:47:00.000Z',
      checkedInBy: 'Gate A - Rina',
    },
  }

  it('renders all 4 metric cards with correct numbers', () => {
    const html = renderToStaticMarkup(React.createElement(AdminStatsCards, { stats: baseStats }))

    expect(html).toContain('Terdaftar')
    expect(html).toContain('48')
    expect(html).toContain('Sudah Hadir')
    expect(html).toContain('24')
    expect(html).toContain('Belum Hadir')
    expect(html).toContain('Sisa Kuota')
    expect(html).toContain('Tak terbatas')
  })

  it('calculates and renders 50% attendance progress bar accurately', () => {
    const html = renderToStaticMarkup(React.createElement(AdminStatsCards, { stats: baseStats }))

    expect(html).toContain('24 dari 48 (50%)')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="24"')
    expect(html).toContain('aria-valuemax="48"')
    expect(html).toContain('width:50%')
  })

  it('handles 0 registered participants gracefully without division by zero', () => {
    const emptyStats: AdminStatsResponse = {
      ...baseStats,
      totals: {
        registered: 0,
        checkedIn: 0,
        notCheckedIn: 0,
        waitlist: 0,
        cancelled: 0,
        remaining: null,
      },
      lastCheckIn: null,
    }

    const html = renderToStaticMarkup(React.createElement(AdminStatsCards, { stats: emptyStats }))

    expect(html).toContain('0 dari 0 (0%)')
    expect(html).toContain('aria-valuenow="0"')
    expect(html).toContain('aria-valuemax="0"')
    expect(html).toContain('width:0%')
    expect(html).toContain('Belum ada peserta yang check-in')
  })

  it('displays last check-in timestamp and staff label in WIB', () => {
    const html = renderToStaticMarkup(React.createElement(AdminStatsCards, { stats: baseStats }))

    // 01:47 UTC is 08:47 WIB
    expect(html).toContain('08:47 WIB')
    expect(html).toContain('Gate A - Rina')
  })

  it('shows pending sheet sync warning when pending > 0', () => {
    const unsyncedStats: AdminStatsResponse = {
      ...baseStats,
      sheetSync: {
        pending: 5,
        lastSyncedAt: null,
      },
    }

    const html = renderToStaticMarkup(React.createElement(AdminStatsCards, { stats: unsyncedStats }))

    expect(html).toContain('5 belum sync Sheets')
  })

  it('renders remaining capacity when event has a capacity limit', () => {
    const cappedStats: AdminStatsResponse = {
      ...baseStats,
      event: {
        ...baseStats.event,
        capacity: 60,
      },
      totals: {
        ...baseStats.totals,
        remaining: 12,
      },
    }

    const html = renderToStaticMarkup(React.createElement(AdminStatsCards, { stats: cappedStats }))

    expect(html).toContain('12')
    expect(html).toContain('Kapasitas maksimal 60')
  })
})
