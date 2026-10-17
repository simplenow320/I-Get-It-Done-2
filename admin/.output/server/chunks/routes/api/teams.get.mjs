import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { s as sql } from '../../_/db.mjs';
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

const teams_get = defineEventHandler(async () => {
  const [invites, delegation, [count], recentInvites] = await Promise.all([
    sql(`SELECT coalesce(status, 'pending') AS status, count(*)::int AS count FROM team_invites GROUP BY 1 ORDER BY 2 DESC`),
    sql(`SELECT coalesce(delegation_status, 'unknown') AS status, count(*)::int AS count
      FROM tasks WHERE delegated_to_user_id IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`),
    sql("SELECT count(*)::int AS links FROM team_members"),
    sql(`SELECT i.id, i.status, i.created_at, i.expires_at, u.id AS inviter_id, u.email AS inviter_email
      FROM team_invites i LEFT JOIN users u ON u.id = i.inviter_id ORDER BY i.created_at DESC LIMIT 25`)
  ]);
  return { invites, delegation, links: count.links, recentInvites };
});

export { teams_get as default };
//# sourceMappingURL=teams.get.mjs.map
