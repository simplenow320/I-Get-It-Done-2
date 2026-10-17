import { s as sql } from './db.mjs';
import { a as getRequestIP } from '../nitro/nitro.mjs';

let ready;
function ensureAuditTable() {
  ready != null ? ready : ready = sql(`CREATE SCHEMA IF NOT EXISTS admin;
    CREATE TABLE IF NOT EXISTS admin.audit_log (
      id bigserial PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      admin_email text,
      action text NOT NULL,
      target_user_id text,
      ip text,
      details jsonb
    );
    CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON admin.audit_log (created_at DESC);`).catch((err) => {
    ready = void 0;
    throw err;
  });
  return ready;
}
async function audit(event, action, { targetUserId, adminEmail, ...details } = {}) {
  var _a, _b, _c;
  const row = {
    admin_email: (_b = adminEmail != null ? adminEmail : (_a = event.context.admin) == null ? void 0 : _a.email) != null ? _b : null,
    action,
    target_user_id: targetUserId != null ? targetUserId : null,
    ip: (_c = getRequestIP(event, { xForwardedFor: true })) != null ? _c : null,
    details
  };
  console.log("[admin-audit]", JSON.stringify(row));
  try {
    await ensureAuditTable();
    await sql(
      "INSERT INTO admin.audit_log (admin_email, action, target_user_id, ip, details) VALUES ($1, $2, $3, $4, $5)",
      [row.admin_email, row.action, row.target_user_id, row.ip, JSON.stringify(details)]
    );
  } catch (err) {
    console.error("[admin-audit] failed to persist:", err.message);
  }
}

export { audit as a, ensureAuditTable as e };
//# sourceMappingURL=audit.mjs.map
