// Mirrors DELETE /api/account/:userId in server/routes.ts; keep the two in sync.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const [user] = await sql<{ email: string | null }>('SELECT email FROM users WHERE id = $1', [id])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (user.email && adminEmails().includes(user.email.toLowerCase())) {
    throw createError({ statusCode: 400, statusMessage: 'Admin accounts cannot be deleted here. Remove the email from NUXT_ADMIN_EMAILS first.' })
  }

  await transaction(async (q) => {
    // Tasks handed to this user reference them without a cascade, so release those first.
    await q(`UPDATE tasks SET delegated_to_user_id = NULL, delegation_status = NULL, assigned_to = NULL,
      delegated_at = NULL, last_delegation_update = NULL WHERE delegated_to_user_id = $1`, [id])
    await q('DELETE FROM delegation_notes WHERE author_id = $1', [id])
    await q('DELETE FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE user_id = $1)', [id])
    await q('DELETE FROM tasks WHERE user_id = $1', [id])
    await q('DELETE FROM contacts WHERE user_id = $1', [id])
    await q('DELETE FROM team_members WHERE user_id = $1 OR teammate_id = $1', [id])
    await q('DELETE FROM team_invites WHERE inviter_id = $1', [id])
    await q('DELETE FROM user_stats WHERE user_id = $1', [id])
    await q('DELETE FROM users WHERE id = $1', [id])
  })
  await audit(event, 'user.delete', { targetUserId: id, email: user.email })
  return { ok: true }
})
