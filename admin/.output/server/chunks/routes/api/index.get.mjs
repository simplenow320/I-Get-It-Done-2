import { d as defineEventHandler, g as getQuery } from '../../nitro/nitro.mjs';
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

const PAGE_SIZE = 25;
const index_get = defineEventHandler(async (event) => {
  var _a;
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status = typeof query.status === "string" ? query.status : "";
  const page = Math.max(1, Number.parseInt(String((_a = query.page) != null ? _a : "1")) || 1);
  const where = `WHERE ($1 = '' OR u.email ILIKE '%' || $1 || '%' OR u.display_name ILIKE '%' || $1 || '%' OR u.id = $1)
    AND ($2 = '' OR coalesce(u.subscription_status, 'none') = $2)`;
  const [rows, [count]] = await Promise.all([
    sql(`SELECT u.id, u.email, u.display_name, coalesce(u.subscription_status, 'none') AS subscription_status,
        u.trial_ends_at, u.lifetime_tasks_created, u.created_at,
        s.last_active_date, s.current_streak, s.points,
        (SELECT count(*) FROM tasks t WHERE t.user_id = u.id)::int AS task_count
      FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC NULLS LAST
      LIMIT ${PAGE_SIZE} OFFSET $3`, [q, status, (page - 1) * PAGE_SIZE]),
    sql(`SELECT count(*)::int AS total FROM users u ${where}`, [q, status])
  ]);
  return { rows, total: count.total, page, pageSize: PAGE_SIZE };
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
