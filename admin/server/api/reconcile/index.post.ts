// shortcut: checks at most 400 users per run (paid/trial/past-due statuses plus anyone with a recorded payment);
// a free user whose purchase webhook was lost entirely is only caught by verifying them on their page.
const MAX_USERS = 400
// Paying customers without access first, manual comp grants last.
const URGENCY = ['locked_out', 'free_access', 'error', 'label', 'manual_grant']

export default defineEventHandler(async (event) => {
  const candidates = await sql<{ id: string, email: string | null }>(`SELECT id, email FROM users
    WHERE coalesce(subscription_status, 'none') <> 'none' OR id IN (SELECT user_id FROM billing_events) LIMIT ${MAX_USERS + 1}`)
  const users = candidates.slice(0, MAX_USERS)
  const ids = users.map(u => u.id)

  const results = await mapLimit(users, 3, async ({ id, email }) => {
    try {
      const c = await checkUser(id)
      return { id, email: c.user.email, current: c.user.subscription_status, currentTrialEndsAt: c.user.trial_ends_at,
        expected: c.expected.status, expectedTrialEndsAt: c.expected.trialEndsAt, reason: c.expected.reason, severity: c.severity, error: null as string | null }
    } catch (err: any) {
      if (err instanceof RevenueCatNotConfigured) throw err
      return { id, email, current: '', currentTrialEndsAt: null, expected: '', expectedTrialEndsAt: null, reason: '', severity: 'error' as const,
        error: String(err?.response?.status ? `RevenueCat ${err.response.status}` : (err?.message ?? 'failed')) }
    }
  }).catch(revenueCatError)

  const counts = results.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.severity]: (acc[r.severity] ?? 0) + 1 }), {})
  await audit(event, 'billing.reconcile_run', { checked: ids.length, truncated: candidates.length > MAX_USERS, counts })
  return { checked: ids.length, truncated: candidates.length > MAX_USERS, counts, mismatches: results.filter(r => r.severity !== 'ok').sort((a, b) => URGENCY.indexOf(a.severity) - URGENCY.indexOf(b.severity)) }
})
