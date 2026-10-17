export default defineEventHandler(async () => {
  const [invites, delegation, [count], recentInvites] = await Promise.all([
    sql<StatusCount>(`SELECT coalesce(status, 'pending') AS status, count(*)::int AS count FROM team_invites GROUP BY 1 ORDER BY 2 DESC`),
    sql<StatusCount>(`SELECT coalesce(delegation_status, 'unknown') AS status, count(*)::int AS count
      FROM tasks WHERE delegated_to_user_id IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`),
    sql<{ links: number }>('SELECT count(*)::int AS links FROM team_members'),
    sql<InviteRow>(`SELECT i.id, i.status, i.created_at, i.expires_at, u.id AS inviter_id, u.email AS inviter_email
      FROM team_invites i LEFT JOIN users u ON u.id = i.inviter_id ORDER BY i.created_at DESC LIMIT 25`)
  ])
  return { invites, delegation, links: count!.links, recentInvites }
})
