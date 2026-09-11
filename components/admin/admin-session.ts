const ADMIN_STORAGE_KEY = 'padel_admin_key'

/**
 * The admin key arrives as a URL fragment rather than a query string. Fragments
 * are never sent to the server, so the key stays out of access logs and out of
 * the Referer header when navigating.
 */
export function readAdminKeyFromFragment(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const match = window.location.hash.match(/[#&]k=([^&]+)/)

  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Removes the key from the address bar so it cannot be shared via screenshots
 * or browser history.
 */
export function stripAdminFragment(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.history.replaceState(null, '', window.location.pathname)
}

export function loadAdminKey(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(ADMIN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeAdminKey(key: string): void {
  try {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, key.trim())
  } catch {
    // If storage is disabled (e.g. private browsing storage quota), ignore
  }
}

export function clearAdminKey(): void {
  try {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY)
  } catch {
    // Nothing to recover from
  }
}

export function withAdminKey(key: string, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${key}`)

  return {
    ...init,
    headers,
  }
}
