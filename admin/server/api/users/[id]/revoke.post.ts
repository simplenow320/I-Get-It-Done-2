// Revokes one credential (tokenId) or all of a kind for the user. Revoked rows stay for history.
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id')!
  const { kind, tokenId } = await readBody<{ kind?: string, tokenId?: string }>(event)
  const table = kind === 'connector' ? 'connector_keys' : kind === 'oauth' ? 'oauth_tokens' : null
  if (!table) throw createError({ statusCode: 400, statusMessage: 'kind must be connector or oauth' })

  const rows = await sql(
    `UPDATE ${table} SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND ($2::text IS NULL OR id = $2) RETURNING id`,
    [userId, tokenId ?? null]
  )
  await audit(event, 'credentials.revoke', { targetUserId: userId, kind, tokenId: tokenId ?? 'all', revoked: rows.length })
  return { revoked: rows.length }
})
