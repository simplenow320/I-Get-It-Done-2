// What this user used and what they paid, from our own tables (no RevenueCat call).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const cost = aiCostSql('u')
  const [usage, events] = await Promise.all([
    sql<{ feature: string, provider: string, requests: number, cost_30d: number, cost_all: number }>(`SELECT feature, provider, count(*)::int AS requests,
        coalesce(sum(${cost}) FILTER (WHERE created_at > now() - interval '30 days'), 0)::float AS cost_30d,
        coalesce(sum(${cost}), 0)::float AS cost_all
      FROM ai_usage u WHERE user_id = $1 GROUP BY 1, 2 ORDER BY cost_all DESC`, [id]),
    sql<BillingEventRow>(`SELECT b.id, b.type, b.product_id, b.store, b.environment, b.period_type, b.price_usd,
        ${PROCEEDS_SQL} AS proceeds, b.event_at
      FROM billing_events b WHERE user_id = $1 ORDER BY b.event_at DESC NULLS LAST LIMIT 100`, [id])
  ])
  return { usage, events }
})
