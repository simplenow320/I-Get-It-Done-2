import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { m as mapLimit, r as revenueCatError, a as applyCheck, c as checkUser } from '../../../_/reconcileCheck.mjs';
import { R as RevenueCatNotConfigured } from '../../../_/finance.mjs';
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
import '../../../_/db.mjs';
import 'pg';
import '../../../_/audit.mjs';

const apply_post = defineEventHandler(async (event) => {
  const { userIds } = await readBody(event);
  if (!Array.isArray(userIds) || !userIds.length || userIds.length > 400 || !userIds.every((id) => typeof id === "string")) {
    throw createError({ statusCode: 400, statusMessage: "Send 1 to 400 user IDs" });
  }
  const outcomes = await mapLimit(userIds, 3, async (id) => {
    var _a, _b;
    try {
      return { id, changed: await applyCheck(event, await checkUser(id)) };
    } catch (err) {
      if (err instanceof RevenueCatNotConfigured) throw err;
      return { id, changed: false, error: (_b = (_a = err == null ? void 0 : err.statusMessage) != null ? _a : err == null ? void 0 : err.message) != null ? _b : "failed" };
    }
  }).catch(revenueCatError);
  return { fixed: outcomes.filter((o) => o.changed).length, failed: outcomes.filter((o) => "error" in o).length, outcomes };
});

export { apply_post as default };
//# sourceMappingURL=apply.post.mjs.map
