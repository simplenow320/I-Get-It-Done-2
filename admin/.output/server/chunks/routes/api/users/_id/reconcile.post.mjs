import { d as defineEventHandler, f as getRouterParam } from '../../../../nitro/nitro.mjs';
import { c as checkUser, a as applyCheck, r as revenueCatError } from '../../../../_/reconcileCheck.mjs';
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
import '../../../../_/db.mjs';
import 'pg';
import '../../../../_/finance.mjs';
import '../../../../_/audit.mjs';

const reconcile_post = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  try {
    const check = await checkUser(id);
    const changed = await applyCheck(event, check);
    return { changed, status: check.expected.status, reason: check.expected.reason };
  } catch (err) {
    revenueCatError(err);
  }
});

export { reconcile_post as default };
//# sourceMappingURL=reconcile.post.mjs.map
