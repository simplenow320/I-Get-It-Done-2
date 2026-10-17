import { h as defineCachedFunction, u as useRuntimeConfig } from '../nitro/nitro.mjs';

const DG_API = "https://api.deepgram.com/v1";
function rcHeaders() {
  return { Authorization: `Bearer ${useRuntimeConfig().revenuecatSecretKey}` };
}
const fetchRevenueCatOverview = defineCachedFunction(async () => {
  const { revenuecatProjectId } = useRuntimeConfig();
  const res = await $fetch(`${useRuntimeConfig().revenuecatApiUrl}/projects/${encodeURIComponent(revenuecatProjectId)}/metrics/overview`, {
    headers: rcHeaders(),
    query: { currency: "USD" }
  });
  return { metrics: res.metrics, currency: res.currency };
}, { name: "rc-overview", maxAge: 300 });
const fetchRevenueCatRevenue = defineCachedFunction(async (start, end, type) => {
  const { revenuecatProjectId } = useRuntimeConfig();
  const res = await $fetch(`${useRuntimeConfig().revenuecatApiUrl}/projects/${encodeURIComponent(revenuecatProjectId)}/metrics/revenue`, {
    headers: rcHeaders(),
    query: { start_date: start, end_date: end, currency: "USD", revenue_type: type }
  });
  return res.value;
}, { name: "rc-revenue", maxAge: 300, getKey: (start, end, type) => `${start}:${end}:${type}` });
const fetchDeepgramBalances = defineCachedFunction(async () => {
  const headers = { Authorization: `Token ${useRuntimeConfig().deepgramApiKey}` };
  const { projects } = await $fetch(`${DG_API}/projects`, { headers });
  return Promise.all(projects.map(async (p) => {
    const { balances } = await $fetch(
      `${DG_API}/projects/${p.project_id}/balances`,
      { headers }
    );
    return { project: p.name, balances: balances.map((b) => ({ amount: b.amount, units: b.units })) };
  }));
}, { name: "dg-balances", maxAge: 300 });
async function settle(fn) {
  var _a, _b;
  try {
    return { data: await fn() };
  } catch (err) {
    const status = (_b = (_a = err == null ? void 0 : err.response) == null ? void 0 : _a.status) != null ? _b : err == null ? void 0 : err.statusCode;
    return { error: status === 401 || status === 403 ? "The API key was rejected or lacks permission." : `Request failed${status ? ` (${status})` : ""}.` };
  }
}
class RevenueCatNotConfigured extends Error {
}
async function fetchCustomerBilling(userId) {
  const { revenuecatSecretKey, revenuecatProjectId } = useRuntimeConfig();
  if (!revenuecatSecretKey || !revenuecatProjectId) throw new RevenueCatNotConfigured();
  const base = `${useRuntimeConfig().revenuecatApiUrl}/projects/${encodeURIComponent(revenuecatProjectId)}/customers/${encodeURIComponent(userId)}`;
  const get = async (path) => {
    var _a, _b;
    try {
      return (await $fetch(`${base}/${path}`, { headers: rcHeaders(), query: { limit: 100 } })).items;
    } catch (err) {
      if (((_b = (_a = err == null ? void 0 : err.response) == null ? void 0 : _a.status) != null ? _b : err == null ? void 0 : err.statusCode) === 404) return [];
      throw err;
    }
  };
  const [subscriptions, purchases] = await Promise.all([get("subscriptions"), get("purchases")]);
  return { subscriptions, purchases };
}

export { RevenueCatNotConfigured as R, fetchRevenueCatRevenue as a, fetchDeepgramBalances as b, fetchCustomerBilling as c, fetchRevenueCatOverview as f, settle as s };
//# sourceMappingURL=finance.mjs.map
