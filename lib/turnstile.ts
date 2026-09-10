interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

export interface TurnstileResult {
  success: boolean
  error?: string
  failOpen?: boolean
}

/**
 * Verifies Cloudflare Turnstile token on the server side.
 * Follows the fail-open principle: if Cloudflare is unreachable or returns 5xx,
 * the verification allows the request through with a warning log (06-SECURITY.md §A4).
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string,
): Promise<TurnstileResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // If secret key is not configured (e.g. local dev / test), bypass gracefully
  if (!secretKey) {
    if (process.env.NODE_ENV !== 'production') {
      return { success: true, failOpen: true }
    }
    console.warn('TURNSTILE_SECRET_KEY is not set in production. Failing open.')
    return { success: true, failOpen: true }
  }

  // Missing or empty token should fail validation
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return { success: false, error: 'MISSING_TOKEN' }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      // Cloudflare service error -> fail-open (06-SECURITY.md §A4)
      console.warn(`Cloudflare Turnstile returned HTTP ${response.status}. Failing open.`)
      return { success: true, failOpen: true }
    }

    const data = (await response.json()) as TurnstileVerifyResponse

    if (!data.success) {
      return {
        success: false,
        error: data['error-codes']?.[0] ?? 'TURNSTILE_FAILED',
      }
    }

    return { success: true }
  } catch (error) {
    // Network error or timeout -> fail-open (06-SECURITY.md §A4)
    console.warn('Cloudflare Turnstile unreachable. Failing open:', error)
    return { success: true, failOpen: true }
  }
}
