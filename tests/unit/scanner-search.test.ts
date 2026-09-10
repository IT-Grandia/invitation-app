import { describe, expect, it } from 'vitest'

import { normalizeForSearch, searchManifest } from '@/lib/scanner-search'
import type { ManifestEntry } from '@/lib/scanner-search'

const entry = (n: string, t: string, c: string | null = null): ManifestEntry => ({ n, t, c })

const entries: ManifestEntry[] = [
  entry('Agus Budiman', 'AGUS0000000000000000000A'),
  entry('Budi Santoso', 'SEEDA0000000000000000000'),
  entry('Citra Dewi', 'CITRA000000000000000000C'),
  entry('Désy Ratnasari', 'DESY0000000000000000000D'),
  entry('Siti Aminah', 'SEEDB0000000000000000000', '2026-09-26T01:03:00.000Z'),
]

const names = (query: string) => searchManifest(entries, query).map((result) => result.n)

describe('normalizeForSearch', () => {
  it('folds case, accents and repeated whitespace', () => {
    expect(normalizeForSearch('  DÉSY   Ratna ')).toBe('desy ratna')
  })
})

describe('searchManifest', () => {
  it('returns nothing until the query is long enough', () => {
    expect(names('')).toEqual([])
    expect(names('b')).toEqual([])
    expect(names('  b  ')).toEqual([])
  })

  it('ranks a name that starts with the query ahead of a later word', () => {
    expect(names('bud')).toEqual(['Budi Santoso', 'Agus Budiman'])
  })

  it('matches a surname', () => {
    expect(names('santoso')).toEqual(['Budi Santoso'])
  })

  it('matches the middle of a name last', () => {
    expect(names('mina')).toEqual(['Siti Aminah'])
  })

  it('ignores accents in both the name and the query', () => {
    expect(names('desy')).toEqual(['Désy Ratnasari'])
    expect(names('DÉSY')).toEqual(['Désy Ratnasari'])
  })

  it('finds a participant by the ticket number shown on their screen', () => {
    expect(names('seedb')).toEqual(['Siti Aminah'])
    expect(names('SEEDB000')).toEqual(['Siti Aminah'])
  })

  it('returns participants who have already checked in', () => {
    expect(searchManifest(entries, 'siti')[0].c).toBe('2026-09-26T01:03:00.000Z')
  })

  it('stops at the limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry(`Peserta ${i}`, `TOKEN${i}`))

    expect(searchManifest(many, 'peserta', 5)).toHaveLength(5)
  })
})
