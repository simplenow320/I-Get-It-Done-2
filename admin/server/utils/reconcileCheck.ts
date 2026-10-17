import type { H3Event } from 'h3'
import { compare, expectedStatus, revenueTotals } from './reconcile'

export async function checkUser(userId: string) {
  const [user] = await sql<{ id: string, email: string | null, subscription_status: string, trial_ends_at: string | null }>(
    `SELECT id, email, coalesce(subscription_status, 'none') AS subscription_status, trial_ends_at FROM users WHERE id = $1`, [userId])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  const billing = await fetchCustomerBilling(userId)
  const expected = expectedStatus(billing.subscriptions, billing.purchases)
  return { user, billing, expected, severity: compare(user.subscription_status, user.trial_ends_at, expected), revenue: revenueTotals(billing.subscriptions, billing.purchases) }
}

// Writes RevenueCat's view onto the user row. Re-derived server-side, never taken from the request.
export async function applyCheck(event: H3Event, check: Awaited<ReturnType<typeof checkUser>>) {
  if (check.severity === 'ok') return false
  await sql('UPDATE users SET subscription_status = $1, trial_ends_at = $2 WHERE id = $3',
    [check.expected.status, check.expected.trialEndsAt, check.user.id])
  await audit(event, 'billing.reconcile', {
    targetUserId: check.user.id,
    from: { status: check.user.subscription_status, trialEndsAt: check.user.trial_ends_at },
    to: { status: check.expected.status, trialEndsAt: check.expected.trialEndsAt },
    severity: check.severity,
    reason: check.expected.reason
  })
  return true
}

export function revenueCatError(err: any): never {
  if (err instanceof RevenueCatNotConfigured) {
    throw createError({ statusCode: 400, statusMessage: 'RevenueCat is not configured. Set NUXT_REVENUECAT_SECRET_KEY and NUXT_REVENUECAT_PROJECT_ID.' })
  }
  if (err?.statusCode && !err?.response) throw err
  const status = err?.response?.status ?? err?.statusCode
  throw createError({ statusCode: 502, statusMessage: status === 401 || status === 403 ? 'RevenueCat rejected the API key (needs Customer Information read access).' : `RevenueCat request failed${status ? ` (${status})` : ''}.` })
}

// Small worker pool so a bulk run stays under RevenueCat's 480 requests/minute (2 requests per user).
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i]!)
    }
  }))
  return out
}
