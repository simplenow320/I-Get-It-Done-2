export default defineEventHandler(async () => {
  const cost = aiCostSql('u')
  const [daily, byFeature, topUsers, [since], voiceDaily] = await Promise.all([
    sql<DayCost>(`SELECT to_char(d, 'YYYY-MM-DD') AS day, count(u.id)::int AS requests, coalesce(sum(${cost}), 0)::float AS cost
      FROM generate_series(current_date - 29, current_date, interval '1 day') d
      LEFT JOIN ai_usage u ON u.created_at::date = d::date GROUP BY d ORDER BY d`),
    sql<FeatureUsage>(`SELECT u.provider, u.model, u.feature, count(*)::int AS requests,
        coalesce(sum(u.input_tokens), 0)::bigint::float AS input_tokens, coalesce(sum(u.output_tokens), 0)::bigint::float AS output_tokens,
        coalesce(sum(u.audio_seconds), 0)::float AS audio_seconds, coalesce(sum(${cost}), 0)::float AS cost
      FROM ai_usage u WHERE u.created_at >= date_trunc('month', now()) GROUP BY 1, 2, 3 ORDER BY cost DESC`),
    sql<AiUserRow>(`SELECT x.id, x.email, coalesce(x.subscription_status, 'none') AS subscription_status,
        count(*)::int AS requests, sum(${cost})::float AS cost
      FROM ai_usage u JOIN users x ON x.id = u.user_id
      WHERE u.created_at >= date_trunc('month', now()) GROUP BY x.id ORDER BY cost DESC LIMIT 25`),
    sql<{ since: string | null }>('SELECT min(created_at) AS since FROM ai_usage'),
    // voice_usage predates per-request tracking, so it still has the longer history.
    sql<DayCount>(`SELECT to_char(d, 'YYYY-MM-DD') AS day, coalesce(sum(v.seconds_used), 0)::int AS count
      FROM generate_series(current_date - 29, current_date, interval '1 day') d
      LEFT JOIN voice_usage v ON v.date = d::date GROUP BY d ORDER BY d`)
  ])
  return { daily, byFeature, topUsers, trackingSince: since!.since, voiceDaily, rates: aiRates() }
})
