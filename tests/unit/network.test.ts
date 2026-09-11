import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchOrNull } from '@/lib/network'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchOrNull', () => {
  it('passes a response through, including one with an error status', async () => {
    const response = new Response('{}', { status: 500 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(fetchOrNull('/api/health', {}, 1000)).resolves.toBe(response)
  })

  it('returns null when the network is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(fetchOrNull('/api/health', {}, 1000)).resolves.toBeNull()
  })

  it('returns null when the server does not answer in time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      ),
    )

    await expect(fetchOrNull('/api/health', {}, 20)).resolves.toBeNull()
  })

  it('rethrows anything that is not a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new RangeError('bad input')))

    await expect(fetchOrNull('/api/health', {}, 1000)).rejects.toThrow(RangeError)
  })
})
