import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAdminKey,
  loadAdminKey,
  readAdminKeyFromFragment,
  storeAdminKey,
  stripAdminFragment,
  withAdminKey,
} from '@/components/admin/admin-session'

class MemoryStorage {
  private items = new Map<string, string>()

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.items.set(key, String(value))
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }

  clear(): void {
    this.items.clear()
  }
}

describe('admin-session', () => {
  let store: MemoryStorage
  let mockLocation: { hash: string; pathname: string }
  let mockReplaceState: ReturnType<typeof vi.fn>

  beforeEach(() => {
    store = new MemoryStorage()
    mockLocation = { hash: '', pathname: '/admin' }
    mockReplaceState = vi.fn()

    vi.stubGlobal('window', {
      localStorage: store,
      location: mockLocation,
      history: {
        replaceState: mockReplaceState,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('readAdminKeyFromFragment', () => {
    it('extracts key from single fragment parameter', () => {
      mockLocation.hash = '#k=my-secret-admin-key'
      expect(readAdminKeyFromFragment()).toBe('my-secret-admin-key')
    })

    it('extracts key when other params are present in fragment', () => {
      mockLocation.hash = '#foo=bar&k=encoded%20key&baz=1'
      expect(readAdminKeyFromFragment()).toBe('encoded key')
    })

    it('returns null if fragment has no k parameter', () => {
      mockLocation.hash = '#other=value'
      expect(readAdminKeyFromFragment()).toBeNull()
    })

    it('returns null if fragment is empty', () => {
      mockLocation.hash = ''
      expect(readAdminKeyFromFragment()).toBeNull()
    })
  })

  describe('stripAdminFragment', () => {
    it('clears the fragment from location using replaceState', () => {
      mockLocation.hash = '#k=secret'

      stripAdminFragment()

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/admin')
    })
  })

  describe('localStorage persistence', () => {
    it('stores, loads, and clears the admin key', () => {
      expect(loadAdminKey()).toBeNull()

      storeAdminKey('admin-secret-123')
      expect(loadAdminKey()).toBe('admin-secret-123')

      clearAdminKey()
      expect(loadAdminKey()).toBeNull()
    })
  })

  describe('withAdminKey', () => {
    it('appends Authorization Bearer header to RequestInit', () => {
      const init = withAdminKey('admin-secret-123', { method: 'GET' })

      const headers = new Headers(init.headers)
      expect(headers.get('Authorization')).toBe('Bearer admin-secret-123')
      expect(init.method).toBe('GET')
    })

    it('preserves existing headers while adding Authorization', () => {
      const init = withAdminKey('admin-secret-123', {
        headers: { 'Content-Type': 'application/json' },
      })

      const headers = new Headers(init.headers)
      expect(headers.get('Authorization')).toBe('Bearer admin-secret-123')
      expect(headers.get('Content-Type')).toBe('application/json')
    })
  })
})
