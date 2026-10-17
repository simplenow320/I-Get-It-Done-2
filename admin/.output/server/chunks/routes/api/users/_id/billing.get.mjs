import { d as defineEventHandler, f as getRouterParam } from '../../../../nitro/nitro.mjs';
import { a as aiCostSql, P as PROCEEDS_SQL } from '../../../../_/aiCost.mjs';
import { s as sql } from '../../../../_/db.mjs';
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

const billing_get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const cost = aiCostSql("u");
  const [usage, events] = await Promise.all([
    sql(`SELECT feature, provider, count(*)::int AS requests,
        coalesce(sum(${cost}) FILTER (WHERE created_at > now() - interval '30 days'), 0)::float AS cost_30d,
        coalesce(sum(${cost}), 0)::float AS cost_all
      FROM ai_usage u WHERE user_id = $1 GROUP BY 1, 2 ORDER BY cost_all DESC`, [id]),
    sql(`SELECT b.id, b.type, b.product_id, b.store, b.environment, b.period_type, b.price_usd,
        ${PROCEEDS_SQL} AS proceeds, b.event_at
      FROM billing_events b WHERE user_id = $1 ORDER BY b.event_at DESC NULLS LAST LIMIT 100`, [id])
  ]);
  return { usage, events };
});

export { billing_get as default };
//# sourceMappingURL=billing.get.mjs.map
