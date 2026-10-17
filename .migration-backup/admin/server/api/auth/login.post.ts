import bcrypt from 'bcryptjs'

// shortcut: in-memory limiter, resets on restart and is per-instance; move to Redis/DB if the admin runs on several instances.
const failures = new Map<string, { count: number, until: number }>()
const MAX_FAILURES = 5
const LOCK_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown, password?: unknown }>(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password || password.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'Enter your email and password' })
  }

  const key = `${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}:${email}`
  const entry = failures.get(key)
  if (entry && entry.count >= MAX_FAILURES && entry.until > Date.now()) {
    await audit(event, 'auth.login_locked', { adminEmail: email.slice(0, 255) })
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again in 15 minutes.' })
  }

  const [user] = adminEmails().includes(email)
    ? await sql<{ id: string, password_hash: string | null }>('SELECT id, password_hash FROM users WHERE lower(email) = $1 LIMIT 1', [email])
    : []
  const ok = !!user?.password_hash && await bcrypt.compare(password, user.password_hash)

  if (!ok) {
    const count = entry && entry.until > Date.now() ? entry.count + 1 : 1
    failures.set(key, { count, until: Date.now() + LOCK_MS })
    await audit(event, 'auth.login_failed', { adminEmail: email.slice(0, 255), attempt: count })
    throw createError({ statusCode: 401, statusMessage: 'Email or password is incorrect, or this account has no admin access' })
  }

  failures.delete(key)
  const session = await adminSession(event)
  await session.update({ userId: user.id, email })
  await audit(event, 'auth.login', { adminEmail: email })
  return { email }
})
