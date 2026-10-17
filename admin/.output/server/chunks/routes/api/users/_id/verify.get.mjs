import { d as defineEventHandler, f as getRouterParam } from '../../../../nitro/nitro.mjs';
import { c as checkUser, r as revenueCatError } from '../../../../_/reconcileCheck.mjs';
import { s as sql } from '../../../../_/db.mjs';
import { P as PROCEEDS_SQL } from '../../../../_/aiCost.mjs';
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
import '../../../../_/finance.mjs';
import '../../../../_/audit.mjs';
import 'pg';

const verify_get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  try {
    const check = await checkUser(id);
    const [recorded] = await sql(
      `SELECT coalesce(sum(b.price_usd), 0)::float AS paid, coalesce(sum(${PROCEEDS_SQL}), 0)::float AS proceeds FROM billing_events b WHERE user_id = $1`,
      [id]
    );
    return { ...check, recorded };
  } catch (err) {
    revenueCatError(err);
  }
});

export { verify_get as default };
//# sourceMappingURL=verify.get.mjs.map
