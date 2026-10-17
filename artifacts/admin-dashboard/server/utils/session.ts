import type { H3Event } from 'h3'

export function adminEmails(): string[] {
  return useRuntimeConfig().adminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

export function adminSession(event: H3Event) {
  const { sessionPassword } = useRuntimeConfig()
  if (sessionPassword.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_SESSION_PASSWORD must be at least 32 characters' })
  }
  return useSession<{ userId?: string, email?: string }>(event, {
    name: 'igid-admin',
    password: sessionPassword,
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, sameSite: 'strict', secure: !import.meta.dev, path: '/admin/' }
  })
}

// Re-checks the allowlist on every request, so removing an email revokes access immediately.
export async function requireAdmin(event: H3Event) {
  const session = await adminSession(event)
  const email = session.data.email
  if (!email || !adminEmails().includes(email)) {
    throw createError({ statusCode: 401, statusMessage: 'Admin sign-in required' })
  }
  return { userId: session.data.userId!, email }
}
