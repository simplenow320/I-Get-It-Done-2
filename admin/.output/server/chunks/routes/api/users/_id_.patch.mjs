import { d as defineEventHandler, f as getRouterParam, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { s as sql } from '../../../_/db.mjs';
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

const STATUSES = ["none", "trialing", "active", "pro", "past_due"];
const _id__patch = defineEventHandler(async (event) => {
  var _a;
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const sets = [];
  const params = [];
  const set = (column, value) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };
  if ("subscriptionStatus" in body) {
    if (!STATUSES.includes(body.subscriptionStatus)) throw createError({ statusCode: 400, statusMessage: "Unknown subscription status" });
    set("subscription_status", body.subscriptionStatus);
  }
  if ("trialEndsAt" in body) {
    const value = body.trialEndsAt === null || body.trialEndsAt === "" ? null : new Date(body.trialEndsAt);
    if (value && Number.isNaN(value.getTime())) throw createError({ statusCode: 400, statusMessage: "Trial end date is not a valid date" });
    set("trial_ends_at", (_a = value == null ? void 0 : value.toISOString()) != null ? _a : null);
  }
  if ("lifetimeTasksCreated" in body) {
    const n = Number(body.lifetimeTasksCreated);
    if (!Number.isInteger(n) || n < 0 || n > 1e6) throw createError({ statusCode: 400, statusMessage: "Lifetime task count must be a whole number of 0 or more" });
    set("lifetime_tasks_created", n);
  }
  if (!sets.length) throw createError({ statusCode: 400, statusMessage: "Nothing to update" });
  params.push(id);
  const [user] = await sql(`UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING id`, params);
  if (!user) throw createError({ statusCode: 404, statusMessage: "User not found" });
  await audit(event, "user.update", { targetUserId: id, changes: body });
  return { ok: true };
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map
