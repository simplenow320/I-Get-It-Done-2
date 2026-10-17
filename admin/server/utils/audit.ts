import type { H3Event } from 'h3'

// Lives in its own `admin` schema so `drizzle-kit push` (which manages `public`) never sees or drops it.
let ready: Promise<unknown> | undefined
export function ensureAuditTable() {
  ready ??= sql(`CREATE SCHEMA IF NOT EXISTS admin;
    CREATE TABLE IF NOT EXISTS admin.audit_log (
      id bigserial PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      admin_email text,
      action text NOT NULL,
      target_user_id text,
      ip text,
      details jsonb
    );
    CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON admin.audit_log (created_at DESC);`)
    .catch((err) => { ready = undefined; throw err })
  return ready
}

// Never throws: a failed audit write must not undo the admin action that already happened.
export async function audit(event: H3Event, action: string, { targetUserId, adminEmail, ...details }: { targetUserId?: string, adminEmail?: string, [key: string]: unknown } = {}) {
  const row = {
    admin_email: adminEmail ?? event.context.admin?.email ?? null,
    action,
    target_user_id: targetUserId ?? null,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
    details
  }
  console.log('[admin-audit]', JSON.stringify(row))
  try {
    await ensureAuditTable()
    await sql('INSERT INTO admin.audit_log (admin_email, action, target_user_id, ip, details) VALUES ($1, $2, $3, $4, $5)',
      [row.admin_email, row.action, row.target_user_id, row.ip, JSON.stringify(details)])
  } catch (err: any) {
    console.error('[admin-audit] failed to persist:', err.message)
  }
}
