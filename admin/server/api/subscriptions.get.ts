// Free Pro trial = first 10 lifetime tasks (see replit.md). Kept in sync with the app by hand.
const FREE_TRIAL_TASKS = 10
const COLUMNS = `u.id, u.email, u.display_name, coalesce(u.subscription_status, 'none') AS subscription_status,
  u.trial_ends_at, u.lifetime_tasks_created, u.created_at, s.last_active_date`

export default defineEventHandler(async () => {
  const [statuses, [funnel], trialsEnding, pastDue, staleTrials, nearLimit] = await Promise.all([
    sql<StatusCount>(`SELECT coalesce(subscription_status, 'none') AS status, count(*)::int AS count FROM users GROUP BY 1 ORDER BY 2 DESC`),
    sql<SubscriptionFunnel>(`SELECT
        count(*) FILTER (WHERE coalesce(subscription_status, 'none') = 'none' AND coalesce(lifetime_tasks_created, 0) < $1)::int AS free_trial,
        count(*) FILTER (WHERE coalesce(subscription_status, 'none') = 'none' AND coalesce(lifetime_tasks_created, 0) >= $1)::int AS trial_used_not_paying,
        count(*) FILTER (WHERE subscription_status = 'trialing' AND trial_ends_at > now())::int AS store_trial,
        count(*) FILTER (WHERE subscription_status IN ('active', 'pro'))::int AS paying,
        count(*) FILTER (WHERE subscription_status = 'past_due')::int AS past_due
      FROM users`, [FREE_TRIAL_TASKS]),
    sql<SubscriberRow>(`SELECT ${COLUMNS} FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
      WHERE u.subscription_status = 'trialing' AND u.trial_ends_at BETWEEN now() AND now() + interval '7 days'
      ORDER BY u.trial_ends_at LIMIT 100`),
    sql<SubscriberRow>(`SELECT ${COLUMNS} FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
      WHERE u.subscription_status = 'past_due' ORDER BY s.last_active_date DESC NULLS LAST LIMIT 100`),
    sql<SubscriberRow>(`SELECT ${COLUMNS} FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
      WHERE u.subscription_status = 'trialing' AND (u.trial_ends_at IS NULL OR u.trial_ends_at < now())
      ORDER BY u.trial_ends_at NULLS FIRST LIMIT 100`),
    sql<SubscriberRow>(`SELECT ${COLUMNS} FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
      WHERE coalesce(u.subscription_status, 'none') = 'none' AND u.lifetime_tasks_created BETWEEN $1 - 3 AND $1 - 1
      ORDER BY u.lifetime_tasks_created DESC, s.last_active_date DESC NULLS LAST LIMIT 100`, [FREE_TRIAL_TASKS])
  ])
  return { statuses, funnel: funnel!, trialsEnding, pastDue, staleTrials, nearLimit, freeTrialTasks: FREE_TRIAL_TASKS }
})
