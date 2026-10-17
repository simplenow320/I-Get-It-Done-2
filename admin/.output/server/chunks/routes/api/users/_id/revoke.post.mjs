import { d as defineEventHandler, f as getRouterParam, r as readBody, c as createError } from '../../../../nitro/nitro.mjs';
import { s as sql } from '../../../../_/db.mjs';
import { a as audit } from '../../../../_/audit.mjs';
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

const revoke_post = defineEventHandler(async (event) => {
  const userId = getRouterParam(event, "id");
  const { kind, tokenId } = await readBody(event);
  const table = kind === "connector" ? "connector_keys" : kind === "oauth" ? "oauth_tokens" : null;
  if (!table) throw createError({ statusCode: 400, statusMessage: "kind must be connector or oauth" });
  const rows = await sql(
    `UPDATE ${table} SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND ($2::text IS NULL OR id = $2) RETURNING id`,
    [userId, tokenId != null ? tokenId : null]
  );
  await audit(event, "credentials.revoke", { targetUserId: userId, kind, tokenId: tokenId != null ? tokenId : "all", revoked: rows.length });
  return { revoked: rows.length };
});

export { revoke_post as default };
//# sourceMappingURL=revoke.post.mjs.map
