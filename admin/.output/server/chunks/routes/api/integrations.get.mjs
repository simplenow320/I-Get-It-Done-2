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

const integrations_get = defineEventHandler(async () => {
  const [[totals], clients, recentKeys] = await Promise.all([
    sql(`SELECT
      (SELECT count(*) FROM connector_keys WHERE revoked_at IS NULL)::int AS active_keys,
      (SELECT count(*) FROM connector_keys WHERE last_used_at > now() - interval '7 days')::int AS keys_used_7d,
      (SELECT count(*) FROM oauth_tokens WHERE revoked_at IS NULL AND coalesce(refresh_expires_at, access_expires_at) > now())::int AS live_oauth_tokens,
      (SELECT count(DISTINCT user_id) FROM oauth_tokens WHERE revoked_at IS NULL)::int AS oauth_users`),
    sql(`SELECT c.id, c.client_name, c.created_at,
        count(t.id) FILTER (WHERE t.revoked_at IS NULL)::int AS active_tokens, max(t.last_used_at) AS last_used_at
      FROM oauth_clients c LEFT JOIN oauth_tokens t ON t.client_id = c.id
      GROUP BY c.id ORDER BY last_used_at DESC NULLS LAST LIMIT 50`),
    sql(`SELECT k.id, k.key_prefix, k.label, k.last_used_at, k.revoked_at, k.created_at, u.id AS user_id, u.email
      FROM connector_keys k JOIN users u ON u.id = k.user_id ORDER BY k.created_at DESC LIMIT 25`)
  ]);
  return { totals, clients, recentKeys };
});

export { integrations_get as default };
//# sourceMappingURL=integrations.get.mjs.map
