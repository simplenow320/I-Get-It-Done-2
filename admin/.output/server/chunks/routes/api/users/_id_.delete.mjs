import { d as defineEventHandler, f as getRouterParam, c as createError, b as adminEmails } from '../../../nitro/nitro.mjs';
import { s as sql, t as transaction } from '../../../_/db.mjs';
import { a as audit } from '../../../_/audit.mjs';
import 'unhead/server';
import 'vue';
import 'unhead/legacy';
import 'unhead/plugins';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:url';
import 'pg';

const _id__delete = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const [user] = await sql("SELECT email FROM users WHERE id = $1", [id]);
  if (!user) throw createError({ statusCode: 404, statusMessage: "User not found" });
  if (user.email && adminEmails().includes(user.email.toLowerCase())) {
    throw createError({ statusCode: 400, statusMessage: "Admin accounts cannot be deleted here. Remove the email from NUXT_ADMIN_EMAILS first." });
  }
  await transaction(async (q) => {
    await q(`UPDATE tasks SET delegated_to_user_id = NULL, delegation_status = NULL, assigned_to = NULL,
      delegated_at = NULL, last_delegation_update = NULL WHERE delegated_to_user_id = $1`, [id]);
    await q("DELETE FROM delegation_notes WHERE author_id = $1", [id]);
    await q("DELETE FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE user_id = $1)", [id]);
    await q("DELETE FROM tasks WHERE user_id = $1", [id]);
    await q("DELETE FROM contacts WHERE user_id = $1", [id]);
    await q("DELETE FROM team_members WHERE user_id = $1 OR teammate_id = $1", [id]);
    await q("DELETE FROM team_invites WHERE inviter_id = $1", [id]);
    await q("DELETE FROM user_stats WHERE user_id = $1", [id]);
    await q("DELETE FROM users WHERE id = $1", [id]);
  });
  await audit(event, "user.delete", { targetUserId: id, email: user.email });
  return { ok: true };
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
