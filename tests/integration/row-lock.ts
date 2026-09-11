import postgres from 'postgres'

const LOCK_WAIT_TIMEOUT_MS = 3000
const POLL_INTERVAL_MS = 10

type Sql = ReturnType<typeof postgres>

/**
 * Runs every attempt against a registration while a separate connection holds
 * that row locked, and releases the lock only once all of them are waiting on it.
 *
 * Starting the attempts together is not enough to make them overlap: against a
 * fast database one attempt can read, write and commit before the next has sent
 * its first query, and a check-in that is not atomic then passes by chance.
 *
 * The attempts share the application pool, so there must be no more of them than
 * it has connections (10 by default). A surplus attempt would be queued on the
 * client behind a blocked query and never reach the lock.
 */
export async function raceOnLockedRow<T>(
  registrationId: string,
  attempts: Array<() => Promise<T>>,
): Promise<T[]> {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  // One connection holds the lock inside a transaction; the other counts waiters.
  const sql = postgres(url, { max: 2, prepare: false })

  try {
    const { results } = await sql.begin(async (tx) => {
      await tx`select id from registrations where id = ${registrationId} for update`

      const pending = Promise.all(attempts.map((attempt) => attempt()))
      // Awaited once the lock is released. This only stops an early failure being
      // reported as unhandled while the waiters are still being counted.
      pending.catch(() => undefined)

      await waitForLockWaiters(sql, attempts.length)

      return { results: pending }
    })

    return await results
  } finally {
    await sql.end()
  }
}

async function waitForLockWaiters(sql: Sql, expected: number) {
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS

  for (;;) {
    const [{ waiting }] = await sql<{ waiting: number }[]>`
      select count(distinct l.pid)::int as waiting
      from pg_locks l
      join pg_stat_activity a on a.pid = l.pid
      where not l.granted and a.datname = current_database()
    `

    if (waiting >= expected) {
      return
    }

    if (Date.now() > deadline) {
      throw new Error(`Only ${waiting} of ${expected} attempts reached the row lock`)
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}
