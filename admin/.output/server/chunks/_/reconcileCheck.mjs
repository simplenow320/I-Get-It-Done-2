import { s as sql } from './db.mjs';
import { c as createError } from '../nitro/nitro.mjs';
import { R as RevenueCatNotConfigured, c as fetchCustomerBilling } from './finance.mjs';
import { a as audit } from './audit.mjs';

function expectedStatus(subs, purchases) {
  const live = subs.filter((s) => s.gives_access);
  const paid = live.find((s) => s.status !== "trialing");
  if (paid) return { status: "active", trialEndsAt: null, reason: `${paid.status} subscription ${paid.product_id}` };
  const trial = live.find((s) => s.status === "trialing");
  if (trial) {
    return {
      status: "trialing",
      trialEndsAt: trial.current_period_ends_at ? new Date(trial.current_period_ends_at).toISOString() : null,
      reason: `trial of ${trial.product_id}`
    };
  }
  const owned = purchases.find((p) => p.status === "owned");
  if (owned) return { status: "active", trialEndsAt: null, reason: `one-time purchase ${owned.product_id}` };
  const retry = subs.find((s) => s.status === "in_billing_retry");
  if (retry) return { status: "past_due", trialEndsAt: null, reason: `billing retry on ${retry.product_id}` };
  return { status: "none", trialEndsAt: null, reason: subs.length || purchases.length ? "nothing currently gives access" : "no purchases in RevenueCat" };
}
function dbHasAccess(status, trialEndsAt, now = Date.now()) {
  return status === "active" || status === "pro" || status === "trialing" && !!trialEndsAt && new Date(trialEndsAt).getTime() > now;
}
function compare(dbStatus, dbTrialEndsAt, expected, now = Date.now()) {
  const dbAccess = dbHasAccess(dbStatus, dbTrialEndsAt, now);
  const rcAccess = expected.status === "active" || expected.status === "trialing";
  if (rcAccess && !dbAccess) return "locked_out";
  if (!rcAccess && dbAccess) return dbStatus === "pro" ? "manual_grant" : "free_access";
  if (dbStatus === "pro" && expected.status === "active") return "ok";
  return dbStatus === expected.status ? "ok" : "label";
}
function revenueTotals(subs, purchases) {
  var _a, _b;
  let gross = 0;
  let proceeds = 0;
  for (const r of [...subs.map((s) => s.total_revenue_in_usd), ...purchases.map((p) => p.revenue_in_usd)]) {
    gross += (_a = r == null ? void 0 : r.gross) != null ? _a : 0;
    proceeds += (_b = r == null ? void 0 : r.proceeds) != null ? _b : 0;
  }
  return { gross, proceeds };
}

async function checkUser(userId) {
  const [user] = await sql(
    `SELECT id, email, coalesce(subscription_status, 'none') AS subscription_status, trial_ends_at FROM users WHERE id = $1`,
    [userId]
  );
  if (!user) throw createError({ statusCode: 404, statusMessage: "User not found" });
  const billing = await fetchCustomerBilling(userId);
  const expected = expectedStatus(billing.subscriptions, billing.purchases);
  return { user, billing, expected, severity: compare(user.subscription_status, user.trial_ends_at, expected), revenue: revenueTotals(billing.subscriptions, billing.purchases) };
}
async function applyCheck(event, check) {
  if (check.severity === "ok") return false;
  await sql(
    "UPDATE users SET subscription_status = $1, trial_ends_at = $2 WHERE id = $3",
    [check.expected.status, check.expected.trialEndsAt, check.user.id]
  );
  await audit(event, "billing.reconcile", {
    targetUserId: check.user.id,
    from: { status: check.user.subscription_status, trialEndsAt: check.user.trial_ends_at },
    to: { status: check.expected.status, trialEndsAt: check.expected.trialEndsAt },
    severity: check.severity,
    reason: check.expected.reason
  });
  return true;
}
function revenueCatError(err) {
  var _a, _b;
  if (err instanceof RevenueCatNotConfigured) {
    throw createError({ statusCode: 400, statusMessage: "RevenueCat is not configured. Set NUXT_REVENUECAT_SECRET_KEY and NUXT_REVENUECAT_PROJECT_ID." });
  }
  if ((err == null ? void 0 : err.statusCode) && !(err == null ? void 0 : err.response)) throw err;
  const status = (_b = (_a = err == null ? void 0 : err.response) == null ? void 0 : _a.status) != null ? _b : err == null ? void 0 : err.statusCode;
  throw createError({ statusCode: 502, statusMessage: status === 401 || status === 403 ? "RevenueCat rejected the API key (needs Customer Information read access)." : `RevenueCat request failed${status ? ` (${status})` : ""}.` });
}
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

export { applyCheck as a, checkUser as c, mapLimit as m, revenueCatError as r };
//# sourceMappingURL=reconcileCheck.mjs.map
