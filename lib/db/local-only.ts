const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Throws unless the connection string points at a database on this machine.
 *
 * For scripts that delete data: the seed empties every table, and the
 * end-to-end suite deletes the events it creates. NODE_ENV is no protection
 * on its own, because a laptop whose DATABASE_URL points at production still
 * runs in development. Only the host is named in the error, never the URL,
 * which carries the password.
 */
export function assertLocalDatabase(url: string, action: string): void {
  let hostname: string

  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error(`Refusing to ${action}: DATABASE_URL is not a valid URL`)
  }

  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to ${action} on ${hostname}: only a database on this machine is allowed`)
  }
}
