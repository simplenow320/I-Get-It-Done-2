import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { s as sql } from '../../_/db.mjs';
import { m as mapLimit, r as revenueCatError, c as checkUser } from '../../_/reconcileCheck.mjs';
import { R as RevenueCatNotConfigured } from '../../_/finance.mjs';
import { a as audit } from '../../_/audit.mjs';
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

const MAX_USERS = 400;
const URGENCY = ["locked_out", "free_access", "error", "label", "manual_grant"];
const index_post = defineEventHandler(async (event) => {
  const candidates = await sql(`SELECT id, email FROM users
    WHERE coalesce(subscription_status, 'none') <> 'none' OR id IN (SELECT user_id FROM billing_events) LIMIT ${MAX_USERS + 1}`);
  const users = candidates.slice(0, MAX_USERS);
  const ids = users.map((u) => u.id);
  const results = await mapLimit(users, 3, async ({ id, email }) => {
    var _a, _b;
    try {
      const c = await checkUser(id);
      return {
        id,
        email: c.user.email,
        current: c.user.subscription_status,
        currentTrialEndsAt: c.user.trial_ends_at,
        expected: c.expected.status,
        expectedTrialEndsAt: c.expected.trialEndsAt,
        reason: c.expected.reason,
        severity: c.severity,
        error: null
      };
    } catch (err) {
      if (err instanceof RevenueCatNotConfigured) throw err;
      return {
        id,
        email,
        current: "",
        currentTrialEndsAt: null,
        expected: "",
        expectedTrialEndsAt: null,
        reason: "",
        severity: "error",
        error: String(((_a = err == null ? void 0 : err.response) == null ? void 0 : _a.status) ? `RevenueCat ${err.response.status}` : (_b = err == null ? void 0 : err.message) != null ? _b : "failed")
      };
    }
  }).catch(revenueCatError);
  const counts = results.reduce((acc, r) => {
    var _a;
    return { ...acc, [r.severity]: ((_a = acc[r.severity]) != null ? _a : 0) + 1 };
  }, {});
  await audit(event, "billing.reconcile_run", { checked: ids.length, truncated: candidates.length > MAX_USERS, counts });
  return { checked: ids.length, truncated: candidates.length > MAX_USERS, counts, mismatches: results.filter((r) => r.severity !== "ok").sort((a, b) => URGENCY.indexOf(a.severity) - URGENCY.indexOf(b.severity)) };
});

export { index_post as default };
//# sourceMappingURL=index.post.mjs.map
