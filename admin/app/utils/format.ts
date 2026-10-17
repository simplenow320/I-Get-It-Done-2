// Date-only values ('YYYY-MM-DD') are calendar days, so parse them as local dates, not UTC midnight.
export function formatDate(value?: string | null) {
  return value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
}

export function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

export function formatNumber(n?: number | null) {
  return (n ?? 0).toLocaleString()
}

// Sub-dollar amounts keep 4 decimals: AI costs per request or per user are often fractions of a cent.
export function formatUsd(n?: number | null) {
  const value = n ?? 0
  const small = value !== 0 && Math.abs(value) < 1
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: small ? 4 : 2 })
}

export function percent(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : '—'
}

export function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60).toLocaleString()} min`
}

export const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  pro: 'success',
  trialing: 'info',
  past_due: 'warning',
  none: 'neutral'
}
