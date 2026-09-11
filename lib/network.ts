export class RequestTimeoutError extends Error {
  constructor() {
    super('Request timed out')
    this.name = 'RequestTimeoutError'
  }
}

// AbortSignal.timeout would cover this, but it is missing from iOS 15 Safari,
// which is inside the range of devices the scanner has to run on.
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new RequestTimeoutError()
    }

    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolves to null when no answer came back at all, which is different from a
 * server that answered with an error. Only the first means the scanner should
 * fall back to the data kept on the device.
 */
export async function fetchOrNull(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response | null> {
  try {
    return await fetchWithTimeout(input, init, timeoutMs)
  } catch (error) {
    // Every browser reports a request that never reached a server as a TypeError.
    if (error instanceof RequestTimeoutError || error instanceof TypeError) {
      return null
    }

    throw error
  }
}
