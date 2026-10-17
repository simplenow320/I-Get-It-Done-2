export default defineEventHandler(async () => {
  const [[totals], subscriptions, signups, completions] = await Promise.all([
    sql<OverviewTotals>(`SELECT
      (SELECT count(*) FROM users)::int AS users,
      (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')::int AS new_users_7d,
      (SELECT count(*) FROM users WHERE created_at > now() - interval '30 days')::int AS new_users_30d,
      (SELECT count(*) FROM user_stats WHERE last_active_date >= current_date - 1)::int AS active_1d,
      (SELECT count(*) FROM user_stats WHERE last_active_date >= current_date - 7)::int AS active_7d,
      (SELECT count(*) FROM users WHERE push_token IS NOT NULL OR notifications_enabled)::int AS push_enabled,
      (SELECT count(*) FROM tasks)::int AS tasks,
      (SELECT count(*) FROM tasks WHERE completed_at IS NOT NULL)::int AS tasks_completed,
      (SELECT count(*) FROM tasks WHERE completed_at > now() - interval '7 days')::int AS tasks_completed_7d,
      (SELECT count(*) FROM tasks WHERE delegated_to_user_id IS NOT NULL)::int AS tasks_delegated,
      (SELECT coalesce(sum(total_focus_minutes), 0) FROM user_stats)::int AS focus_minutes,
      (SELECT coalesce(sum(seconds_used), 0) FROM voice_usage WHERE date >= date_trunc('month', current_date))::int AS voice_seconds_month`),
    sql<StatusCount>(`SELECT coalesce(subscription_status, 'none') AS status, count(*)::int AS count
      FROM users GROUP BY 1 ORDER BY 2 DESC`),
    sql<DayCount>(`SELECT to_char(d, 'YYYY-MM-DD') AS day, count(u.id)::int AS count
      FROM generate_series(current_date - 29, current_date, interval '1 day') d
      LEFT JOIN users u ON u.created_at::date = d::date GROUP BY d ORDER BY d`),
    sql<DayCount>(`SELECT to_char(d, 'YYYY-MM-DD') AS day, count(t.id)::int AS count
      FROM generate_series(current_date - 29, current_date, interval '1 day') d
      LEFT JOIN tasks t ON t.completed_at::date = d::date GROUP BY d ORDER BY d`)
  ])
  return { totals: totals!, subscriptions, signups, completions }
})
