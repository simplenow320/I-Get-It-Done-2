export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const [user] = await sql<UserDetail>(`SELECT id, email, display_name, device_id IS NOT NULL AS has_device,
      push_token IS NOT NULL AS has_push_token, notifications_enabled, notification_intensity,
      coalesce(subscription_status, 'none') AS subscription_status, trial_ends_at, lifetime_tasks_created,
      timezone_offset_minutes, created_at, password_hash IS NOT NULL AS has_password
    FROM users WHERE id = $1`, [id])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const [[stats], lanes, connectorKeys, oauthTokens, team, voice] = await Promise.all([
    sql<UserStatsRow>('SELECT * FROM user_stats WHERE user_id = $1', [id]),
    sql<LaneCount>(`SELECT lane, count(*) FILTER (WHERE completed_at IS NULL)::int AS open,
        count(*) FILTER (WHERE completed_at IS NOT NULL)::int AS done
      FROM tasks WHERE user_id = $1 GROUP BY lane ORDER BY lane`, [id]),
    sql<ConnectorKeyRow>(`SELECT id, key_prefix, label, last_used_at, revoked_at, created_at
      FROM connector_keys WHERE user_id = $1 ORDER BY created_at DESC`, [id]),
    sql<OAuthTokenRow>(`SELECT t.id, coalesce(c.client_name, t.client_id) AS client, t.last_used_at, t.revoked_at,
        t.access_expires_at, t.refresh_expires_at, t.created_at
      FROM oauth_tokens t LEFT JOIN oauth_clients c ON c.id = t.client_id
      WHERE t.user_id = $1 ORDER BY t.created_at DESC LIMIT 50`, [id]),
    sql<TeammateRow>(`SELECT m.id, m.nickname, m.role, u.id AS teammate_id, u.email, u.display_name
      FROM team_members m JOIN users u ON u.id = m.teammate_id WHERE m.user_id = $1`, [id]),
    sql<VoiceDay>(`SELECT to_char(date, 'YYYY-MM-DD') AS day, seconds_used FROM voice_usage
      WHERE user_id = $1 AND date >= current_date - 29 ORDER BY date`, [id])
  ])
  return { user, stats: stats ?? null, lanes, connectorKeys, oauthTokens, team, voice }
})
