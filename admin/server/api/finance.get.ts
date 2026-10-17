const iso = (d: Date) => d.toISOString().slice(0, 10)

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const lastMonthEnd = new Date(monthStart.getTime() - 86400000)
  const windows = [
    { label: 'This month', start: iso(monthStart), end: iso(now) },
    { label: 'Last month', start: iso(lastMonthStart), end: iso(lastMonthEnd) },
    { label: 'Last 30 days', start: iso(new Date(now.getTime() - 29 * 86400000)), end: iso(now) }
  ]

  const rcConfigured = !!(config.revenuecatSecretKey && config.revenuecatProjectId)
  const [overview, revenue, deepgram, tracked, [since]] = await Promise.all([
    rcConfigured ? settle(() => fetchRevenueCatOverview()) : null,
    rcConfigured
      ? settle(() => Promise.all(windows.map(async w => ({
          ...w,
          revenue: await fetchRevenueCatRevenue(w.start, w.end, 'revenue'),
          proceeds: await fetchRevenueCatRevenue(w.start, w.end, 'proceeds')
        }))))
      : null,
    config.deepgramApiKey ? settle(() => fetchDeepgramBalances()) : null,
    // AI cost and webhook-recorded revenue for the same three windows, from our own tables.
    Promise.all(windows.map(async (w) => {
      const [row] = await sql<{ ai_cost: number, openai: number, deepgram: number, paid: number, proceeds: number }>(`SELECT
          (SELECT coalesce(sum(${aiCostSql('u')}), 0) FROM ai_usage u WHERE u.created_at::date BETWEEN $1 AND $2)::float AS ai_cost,
          (SELECT coalesce(sum(${aiCostSql('u')}), 0) FROM ai_usage u WHERE u.provider = 'openai' AND u.created_at::date BETWEEN $1 AND $2)::float AS openai,
          (SELECT coalesce(sum(${aiCostSql('u')}), 0) FROM ai_usage u WHERE u.provider = 'deepgram' AND u.created_at::date BETWEEN $1 AND $2)::float AS deepgram,
          (SELECT coalesce(sum(b.price_usd), 0) FROM billing_events b WHERE b.event_at::date BETWEEN $1 AND $2)::float AS paid,
          (SELECT coalesce(sum(${PROCEEDS_SQL}), 0) FROM billing_events b WHERE b.event_at::date BETWEEN $1 AND $2)::float AS proceeds`,
        [w.start, w.end])
      return { ...w, ...row! }
    })),
    sql<{ ai: string | null, billing: string | null }>('SELECT (SELECT min(created_at) FROM ai_usage) AS ai, (SELECT min(created_at) FROM billing_events) AS billing')
  ])

  return {
    revenuecat: { configured: rcConfigured, overview, revenue },
    deepgram: { configured: !!config.deepgramApiKey, balances: deepgram },
    tracked,
    trackingSince: since!,
    rates: aiRates()
  }
})
