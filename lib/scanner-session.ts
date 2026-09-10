const STORAGE_KEY = 'padel_staff_key'

/**
 * The staff key arrives as a URL fragment rather than a query string. Fragments
 * are never sent to the server, so the key stays out of access logs and out of
 * the Referer header when the browser follows a link away from the page.
 */
export function readKeyFromFragment(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const match = window.location.hash.match(/[#&]k=([^&]+)/)

  return match ? decodeURIComponent(match[1]) : null
}

/** Removes the key from the address bar so it cannot be shared in a screenshot. */
export function stripFragment(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.history.replaceState(null, '', window.location.pathname)
}

export function loadStoredKey(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private browsing and blocked site data both throw here rather than
    // returning null, and neither should take the scanner down.
    return null
  }
}

export function storeKey(key: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, key)
  } catch {
    // Losing persistence only costs the officer a re-entry after a reload.
  }
}

export function clearStoredKey(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to recover from; the key is invalid either way.
  }
}

const LABEL_KEY = 'padel_staff_label'

/**
 * Recorded with every check-in so a disputed entry can be traced back to a gate.
 * Kept per device, since each phone is held by one officer for the whole day.
 */
export function loadStaffLabel(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(LABEL_KEY)
  } catch {
    return null
  }
}

export function storeStaffLabel(label: string): void {
  try {
    const trimmed = label.trim()

    if (trimmed) {
      window.localStorage.setItem(LABEL_KEY, trimmed)
    } else {
      window.localStorage.removeItem(LABEL_KEY)
    }
  } catch {
    // The label only enriches the audit trail; losing it blocks nothing.
  }
}
