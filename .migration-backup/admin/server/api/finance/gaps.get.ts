const PAGE_SIZE = 50

// Per-user AI cost against what they paid, over the same window. Both come from tables the
// server started filling on the same deploy, so the window never compares cost without revenue.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = [7, 30, 90, 365].includes(Number(query.days)) ? Number(query.days) : 30
  const losingOnly = query.losing === '1'
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1')) || 1)
  const cost = aiCostSql('u')

  const base = `WITH c AS (
      SELECT user_id, count(*)::int AS requests, sum(${cost})::float AS ai_cost
      FROM ai_usage u WHERE u.created_at > now() - make_interval(days => $1) AND user_id IS NOT NULL GROUP BY user_id),
    r AS (
      SELECT user_id, sum(coalesce(b.price_usd, 0))::float AS paid, sum(${PROCEEDS_SQL})::float AS proceeds
      FROM billing_events b WHERE b.event_at > now() - make_interval(days => $1) AND user_id IS NOT NULL GROUP BY user_id),
    g AS (
      SELECT x.id, x.email, coalesce(x.subscription_status, 'none') AS subscription_status,
        coalesce(c.requests, 0) AS requests, coalesce(c.ai_cost, 0) AS ai_cost,
        coalesce(r.paid, 0) AS paid, coalesce(r.proceeds, 0) AS proceeds,
        coalesce(r.proceeds, 0) - coalesce(c.ai_cost, 0) AS margin
      FROM users x LEFT JOIN c ON c.user_id = x.id LEFT JOIN r ON r.user_id = x.id
      WHERE c.user_id IS NOT NULL OR r.user_id IS NOT NULL)`
  const where = losingOnly ? 'WHERE margin < 0' : ''

  const [rows, [summary]] = await Promise.all([
    sql<GapRow>(`${base} SELECT * FROM g ${where} ORDER BY margin ASC, ai_cost DESC LIMIT ${PAGE_SIZE} OFFSET $2`, [days, (page - 1) * PAGE_SIZE]),
    sql<GapSummary>(`${base} SELECT count(*)::int AS users,
        count(*) FILTER (WHERE margin < 0)::int AS losing,
        coalesce(sum(ai_cost), 0)::float AS ai_cost, coalesce(sum(paid), 0)::float AS paid, coalesce(sum(proceeds), 0)::float AS proceeds,
        coalesce(sum(ai_cost) FILTER (WHERE paid <= 0), 0)::float AS unpaid_ai_cost,
        count(*) FILTER (WHERE ${where ? 'margin < 0' : 'true'})::int AS total
      FROM g`, [days])
  ])
  return { rows, summary: summary!, days, page, pageSize: PAGE_SIZE, total: summary!.total }
})
