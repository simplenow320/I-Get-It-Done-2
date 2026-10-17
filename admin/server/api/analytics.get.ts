// "Activity" = creating or completing a task: the only per-event timestamps the app stores.
const ACTIVITY = `SELECT user_id, created_at AS at FROM tasks UNION ALL SELECT user_id, completed_at FROM tasks WHERE completed_at IS NOT NULL`

export default defineEventHandler(async () => {
  const [[actives], weekly, cohortHits, [adoption], [funnel], lanes] = await Promise.all([
    sql<ActiveCounts>(`WITH a AS (${ACTIVITY}) SELECT
        (SELECT count(DISTINCT user_id) FROM a WHERE at > now() - interval '1 day')::int AS dau,
        (SELECT count(DISTINCT user_id) FROM a WHERE at > now() - interval '7 days')::int AS wau,
        (SELECT count(DISTINCT user_id) FROM a WHERE at > now() - interval '30 days')::int AS mau,
        (SELECT count(DISTINCT user_id) FROM (
          SELECT user_id FROM a WHERE at > now() - interval '15 minutes'
          UNION SELECT user_id FROM voice_usage WHERE updated_at > now() - interval '15 minutes'
          UNION SELECT user_id FROM oauth_tokens WHERE last_used_at > now() - interval '15 minutes'
          UNION SELECT user_id FROM connector_keys WHERE last_used_at > now() - interval '15 minutes'
        ) live)::int AS live_15m`),
    sql<DayCount>(`WITH a AS (${ACTIVITY})
      SELECT to_char(w, 'YYYY-MM-DD') AS day, count(DISTINCT a.user_id)::int AS count
      FROM generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') w
      LEFT JOIN a ON a.at >= w AND a.at < w + interval '1 week' GROUP BY w ORDER BY w`),
    // Weekly sign-up cohorts (last 8 weeks) and how many of each were active N weeks after joining. One pass over activity.
    sql<{ week: string, size: number, n: number | null, active: number }>(`WITH a AS (${ACTIVITY}),
      c AS (SELECT id, date_trunc('week', created_at) AS week FROM users WHERE created_at >= date_trunc('week', now()) - interval '7 weeks'),
      sizes AS (SELECT week, count(*)::int AS size FROM c GROUP BY week),
      hits AS (SELECT c.week, floor(extract(epoch FROM a.at - c.week) / 604800)::int AS n, count(DISTINCT a.user_id)::int AS active
        FROM c JOIN a ON a.user_id = c.id AND a.at >= c.week GROUP BY 1, 2)
      SELECT to_char(sizes.week, 'YYYY-MM-DD') AS week, sizes.size, hits.n, coalesce(hits.active, 0) AS active
      FROM sizes LEFT JOIN hits ON hits.week = sizes.week ORDER BY sizes.week, hits.n`),
    sql<Adoption>(`SELECT
        (SELECT count(*) FROM users)::int AS users,
        (SELECT count(DISTINCT user_id) FROM tasks)::int AS tasks,
        (SELECT count(DISTINCT t.user_id) FROM subtasks s JOIN tasks t ON t.id = s.task_id)::int AS subtasks,
        (SELECT count(*) FROM user_stats WHERE total_focus_minutes > 0)::int AS focus,
        (SELECT count(DISTINCT user_id) FROM voice_usage WHERE seconds_used > 0)::int AS voice,
        (SELECT count(DISTINCT user_id) FROM tasks WHERE delegated_to_user_id IS NOT NULL OR assigned_to IS NOT NULL)::int AS delegation,
        (SELECT count(DISTINCT user_id) FROM team_members)::int AS team,
        (SELECT count(DISTINCT user_id) FROM (SELECT user_id FROM connector_keys UNION SELECT user_id FROM oauth_tokens) x)::int AS ai_connector,
        (SELECT count(*) FROM users WHERE push_token IS NOT NULL)::int AS push`),
    sql<Funnel>(`SELECT count(*)::int AS signed_up,
        count(*) FILTER (WHERE coalesce(lifetime_tasks_created, 0) >= 1)::int AS first_task,
        count(*) FILTER (WHERE coalesce(lifetime_tasks_created, 0) >= 10)::int AS trial_used,
        count(*) FILTER (WHERE subscription_status IN ('active', 'pro'))::int AS paying
      FROM users`),
    sql<{ lane: string, count: number }>(`SELECT lane, count(*)::int AS count FROM tasks WHERE completed_at IS NULL GROUP BY lane ORDER BY 2 DESC`)
  ])
  const cohorts: CohortRow[] = []
  for (const row of cohortHits) {
    let cohort = cohorts.at(-1)
    if (cohort?.week !== row.week) {
      const weeksSince = Math.floor((Date.now() - new Date(`${row.week}T00:00:00Z`).getTime()) / 604800000)
      cohort = { week: row.week, size: row.size, active: Array(Math.min(8, weeksSince + 1)).fill(0) }
      cohorts.push(cohort)
    }
    if (row.n !== null && row.n < cohort.active.length) cohort.active[row.n] = row.active
  }
  return { actives: actives!, weekly, cohorts, adoption: adoption!, funnel: funnel!, lanes }
})
