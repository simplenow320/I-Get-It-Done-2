const PAGE_SIZE = 50

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const action = typeof query.action === 'string' ? query.action : ''
  const admin = typeof query.admin === 'string' ? query.admin.trim().toLowerCase() : ''
  const target = typeof query.target === 'string' ? query.target.trim() : ''
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1')) || 1)

  await ensureAuditTable()
  const where = `WHERE ($1 = '' OR a.action = $1) AND ($2 = '' OR a.admin_email ILIKE '%' || $2 || '%') AND ($3 = '' OR a.target_user_id = $3)`
  const [rows, [count], actions] = await Promise.all([
    sql<AuditRow>(`SELECT a.id::text, a.created_at, a.admin_email, a.action, a.target_user_id, u.email AS target_email, a.ip, a.details
      FROM admin.audit_log a LEFT JOIN users u ON u.id = a.target_user_id
      ${where} ORDER BY a.created_at DESC LIMIT ${PAGE_SIZE} OFFSET $4`, [action, admin, target, (page - 1) * PAGE_SIZE]),
    sql<{ total: number }>(`SELECT count(*)::int AS total FROM admin.audit_log a ${where}`, [action, admin, target]),
    sql<{ action: string }>('SELECT DISTINCT action FROM admin.audit_log ORDER BY action')
  ])
  return { rows, total: count!.total, page, pageSize: PAGE_SIZE, actions: actions.map(a => a.action) }
})
