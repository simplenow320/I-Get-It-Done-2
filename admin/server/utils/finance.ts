import type { RcPurchase, RcSubscription } from './reconcile'
// External finance sources, cached for 5 minutes so page refreshes don't hit vendor rate limits.
const DG_API = 'https://api.deepgram.com/v1'

export interface RevenueCatOverview {
  metrics: { id: string, name: string, description: string, unit: string, period: string, value: number }[]
  currency: string
}
export interface RevenueWindow { label: string, start: string, end: string, revenue: number, proceeds: number }

function rcHeaders() {
  return { Authorization: `Bearer ${useRuntimeConfig().revenuecatSecretKey}` }
}

export const fetchRevenueCatOverview = defineCachedFunction(async (): Promise<RevenueCatOverview> => {
  const { revenuecatProjectId } = useRuntimeConfig()
  const res = await $fetch<RevenueCatOverview>(`${useRuntimeConfig().revenuecatApiUrl}/projects/${encodeURIComponent(revenuecatProjectId)}/metrics/overview`, {
    headers: rcHeaders(), query: { currency: 'USD' }
  })
  return { metrics: res.metrics, currency: res.currency }
}, { name: 'rc-overview', maxAge: 300 })

export const fetchRevenueCatRevenue = defineCachedFunction(async (start: string, end: string, type: 'revenue' | 'proceeds') => {
  const { revenuecatProjectId } = useRuntimeConfig()
  const res = await $fetch<{ value: number }>(`${useRuntimeConfig().revenuecatApiUrl}/projects/${encodeURIComponent(revenuecatProjectId)}/metrics/revenue`, {
    headers: rcHeaders(), query: { start_date: start, end_date: end, currency: 'USD', revenue_type: type }
  })
  return res.value
}, { name: 'rc-revenue', maxAge: 300, getKey: (start: string, end: string, type: string) => `${start}:${end}:${type}` })

export const fetchDeepgramBalances = defineCachedFunction(async () => {
  const headers = { Authorization: `Token ${useRuntimeConfig().deepgramApiKey}` }
  const { projects } = await $fetch<{ projects: { project_id: string, name: string }[] }>(`${DG_API}/projects`, { headers })
  return Promise.all(projects.map(async (p) => {
    const { balances } = await $fetch<{ balances: { balance_id: string, amount: number, units: string }[] }>(
      `${DG_API}/projects/${p.project_id}/balances`, { headers })
    return { project: p.name, balances: balances.map(b => ({ amount: b.amount, units: b.units })) }
  }))
}, { name: 'dg-balances', maxAge: 300 })

// Turns a vendor failure into a message for the page instead of failing the whole response.
export async function settle<T>(fn: () => Promise<T>): Promise<{ data?: T, error?: string }> {
  try {
    return { data: await fn() }
  } catch (err: any) {
    const status = err?.response?.status ?? err?.statusCode
    return { error: status === 401 || status === 403 ? 'The API key was rejected or lacks permission.' : `Request failed${status ? ` (${status})` : ''}.` }
  }
}

export class RevenueCatNotConfigured extends Error {}

// Live (uncached) customer billing, for verification. A customer RevenueCat has never seen is a 404: no purchases.
// shortcut: reads the first 100 subscriptions/purchases only; page through next_page if a customer can exceed that.
export async function fetchCustomerBilling(userId: string): Promise<{ subscriptions: RcSubscription[], purchases: RcPurchase[] }> {
  const { revenuecatSecretKey, revenuecatProjectId } = useRuntimeConfig()
  if (!revenuecatSecretKey || !revenuecatProjectId) throw new RevenueCatNotConfigured()
  const base = `${useRuntimeConfig().revenuecatApiUrl}/projects/${encodeURIComponent(revenuecatProjectId)}/customers/${encodeURIComponent(userId)}`
  const get = async <T>(path: string) => {
    try {
      return (await $fetch<{ items: T[] }>(`${base}/${path}`, { headers: rcHeaders(), query: { limit: 100 } })).items
    } catch (err: any) {
      if ((err?.response?.status ?? err?.statusCode) === 404) return []
      throw err
    }
  }
  const [subscriptions, purchases] = await Promise.all([get<RcSubscription>('subscriptions'), get<RcPurchase>('purchases')])
  return { subscriptions, purchases }
}
