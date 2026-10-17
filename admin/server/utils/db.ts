import pg from 'pg'

// Columns are `timestamp` without zone holding UTC (Drizzle's convention in the Express API), so read them as UTC
// instead of server-local time. `date` columns stay plain 'YYYY-MM-DD' strings.
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, s => new Date(s.replace(' ', 'T') + 'Z'))
pg.types.setTypeParser(pg.types.builtins.DATE, s => s)
// numeric (money) arrives as a string; the admin only displays and sums it, so a JS number is enough.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, s => Number.parseFloat(s))

let pool: pg.Pool | undefined

function getPool() {
  if (!pool) {
    const { databaseUrl } = useRuntimeConfig()
    if (!databaseUrl) throw createError({ statusCode: 500, statusMessage: 'Admin database is not configured' })
    pool = new pg.Pool({ connectionString: databaseUrl, max: 5, idleTimeoutMillis: 30000 })
    pool.on('error', err => console.error('[admin] pg pool error:', err.message))
  }
  return pool
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await getPool().query(text, params)
  return rows
}

export async function transaction<T>(fn: (q: typeof sql) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(async (text, params = []) => (await client.query(text, params)).rows)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
