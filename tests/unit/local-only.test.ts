import { describe, expect, it } from 'vitest'

import { assertLocalDatabase } from '@/lib/db/local-only'

describe('assertLocalDatabase', () => {
  it.each([
    'postgresql://padel:secret@localhost:5433/padel_dev',
    'postgresql://padel:secret@127.0.0.1:5432/padel_dev',
    'postgres://padel:secret@[::1]:5432/padel_dev',
  ])('allows %s', (url) => {
    expect(() => assertLocalDatabase(url, 'seed')).not.toThrow()
  })

  // The shapes a production URL takes: Supabase's direct host and its pooler.
  it.each([
    'postgresql://postgres:secret@db.abcdefghijkl.supabase.co:5432/postgres',
    'postgresql://postgres.abcdefghijkl:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    'postgresql://padel:secret@localhost.example.com:5432/padel',
  ])('refuses %s', (url) => {
    expect(() => assertLocalDatabase(url, 'seed')).toThrow(/Refusing to seed on /)
  })

  it('never repeats the password in the error', () => {
    expect(() =>
      assertLocalDatabase('postgresql://postgres:hunter2@db.example.supabase.co:5432/postgres', 'seed'),
    ).toThrow(expect.objectContaining({ message: expect.not.stringContaining('hunter2') }))
  })

  it('refuses a value that is not a URL', () => {
    expect(() => assertLocalDatabase('not a url', 'seed')).toThrow(/not a valid URL/)
  })
})
