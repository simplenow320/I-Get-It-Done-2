// Pure: decides what users.subscription_status should be from RevenueCat data, mirroring
// the webhook mapping in server/routes.ts. No Nuxt auto-imports so node --test can run it.

export interface RcSubscription {
  id: string, product_id: string, store: string, environment: string, status: string,
  gives_access: boolean, current_period_ends_at: number | null,
  total_revenue_in_usd?: { gross: number, proceeds: number } | null
}
export interface RcPurchase {
  id: string, product_id: string, status: string, store: string, purchased_at: number | null,
  revenue_in_usd?: { gross: number, proceeds: number } | null
}

export type Severity = 'ok' | 'locked_out' | 'free_access' | 'manual_grant' | 'label'

export interface Expected { status: 'none' | 'trialing' | 'active' | 'past_due', trialEndsAt: string | null, reason: string }

export function expectedStatus(subs: RcSubscription[], purchases: RcPurchase[]): Expected {
  const live = subs.filter(s => s.gives_access)
  const paid = live.find(s => s.status !== 'trialing')
  if (paid) return { status: 'active', trialEndsAt: null, reason: `${paid.status} subscription ${paid.product_id}` }
  const trial = live.find(s => s.status === 'trialing')
  if (trial) {
    return {
      status: 'trialing',
      trialEndsAt: trial.current_period_ends_at ? new Date(trial.current_period_ends_at).toISOString() : null,
      reason: `trial of ${trial.product_id}`
    }
  }
  const owned = purchases.find(p => p.status === 'owned')
  if (owned) return { status: 'active', trialEndsAt: null, reason: `one-time purchase ${owned.product_id}` }
  const retry = subs.find(s => s.status === 'in_billing_retry')
  if (retry) return { status: 'past_due', trialEndsAt: null, reason: `billing retry on ${retry.product_id}` }
  return { status: 'none', trialEndsAt: null, reason: subs.length || purchases.length ? 'nothing currently gives access' : 'no purchases in RevenueCat' }
}

// Same access rule as GET /api/subscription/:userId (owner override aside).
export function dbHasAccess(status: string, trialEndsAt: string | Date | null, now = Date.now()) {
  return status === 'active' || status === 'pro' || (status === 'trialing' && !!trialEndsAt && new Date(trialEndsAt).getTime() > now)
}

export function compare(dbStatus: string, dbTrialEndsAt: string | Date | null, expected: Expected, now = Date.now()): Severity {
  const dbAccess = dbHasAccess(dbStatus, dbTrialEndsAt, now)
  const rcAccess = expected.status === 'active' || expected.status === 'trialing'
  if (rcAccess && !dbAccess) return 'locked_out'
  // 'pro' is never set by the webhook, so it is a manual grant (comp account), not an error.
  if (!rcAccess && dbAccess) return dbStatus === 'pro' ? 'manual_grant' : 'free_access'
  if (dbStatus === 'pro' && expected.status === 'active') return 'ok'
  return dbStatus === expected.status ? 'ok' : 'label'
}

export function revenueTotals(subs: RcSubscription[], purchases: RcPurchase[]) {
  let gross = 0
  let proceeds = 0
  for (const r of [...subs.map(s => s.total_revenue_in_usd), ...purchases.map(p => p.revenue_in_usd)]) {
    gross += r?.gross ?? 0
    proceeds += r?.proceeds ?? 0
  }
  return { gross, proceeds }
}
