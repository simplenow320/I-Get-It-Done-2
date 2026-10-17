// Row shapes returned by server/api. Timestamps arrive as ISO strings.
export interface DayCount { day: string, count: number }
export interface StatusCount { status: string, count: number }

export interface OverviewTotals {
  users: number, new_users_7d: number, new_users_30d: number, active_1d: number, active_7d: number,
  push_enabled: number, tasks: number, tasks_completed: number, tasks_completed_7d: number,
  tasks_delegated: number, focus_minutes: number, voice_seconds_month: number
}

export interface UserRow {
  id: string, email: string | null, display_name: string | null, subscription_status: string,
  trial_ends_at: string | null, lifetime_tasks_created: number | null, created_at: string | null,
  last_active_date: string | null, current_streak: number | null, points: number | null, task_count: number
}

export interface UserDetail {
  id: string, email: string | null, display_name: string | null, has_device: boolean, has_push_token: boolean,
  notifications_enabled: boolean | null, notification_intensity: string | null, subscription_status: string,
  trial_ends_at: string | null, lifetime_tasks_created: number | null, timezone_offset_minutes: number | null,
  created_at: string | null, has_password: boolean
}

export interface UserStatsRow {
  current_streak: number | null, longest_streak: number | null, total_tasks_completed: number | null,
  total_focus_minutes: number | null, points: number | null, level: string | null, last_active_date: string | null
}

export interface LaneCount { lane: string, open: number, done: number }
export interface ConnectorKeyRow { id: string, key_prefix: string, label: string | null, last_used_at: string | null, revoked_at: string | null, created_at: string | null }
export interface OAuthTokenRow { id: string, client: string, last_used_at: string | null, revoked_at: string | null, created_at: string | null }
export interface TeammateRow { id: string, nickname: string | null, role: string | null, teammate_id: string, email: string | null, display_name: string | null }
export interface VoiceDay { day: string, seconds_used: number }

export interface InviteRow { id: string, status: string | null, created_at: string | null, expires_at: string | null, inviter_id: string | null, inviter_email: string | null }
export interface IntegrationTotals { active_keys: number, keys_used_7d: number, live_oauth_tokens: number, oauth_users: number }
export interface OAuthClientRow { id: string, client_name: string | null, created_at: string | null, active_tokens: number, last_used_at: string | null }
export interface RecentKeyRow extends ConnectorKeyRow { user_id: string, email: string | null }
export interface VoiceUserRow { id: string, email: string | null, subscription_status: string, seconds: number }

export interface AuditRow {
  id: string, created_at: string, admin_email: string | null, action: string, target_user_id: string | null,
  target_email: string | null, ip: string | null, details: Record<string, unknown> | null
}

export interface SubscriptionFunnel { free_trial: number, trial_used_not_paying: number, store_trial: number, paying: number, past_due: number }
export interface SubscriberRow {
  id: string, email: string | null, display_name: string | null, subscription_status: string, trial_ends_at: string | null,
  lifetime_tasks_created: number | null, created_at: string | null, last_active_date: string | null
}

export interface ActiveCounts { dau: number, wau: number, mau: number, live_15m: number }
export interface CohortRow { week: string, size: number, active: number[] }
export interface Adoption { users: number, tasks: number, subtasks: number, focus: number, voice: number, delegation: number, team: number, ai_connector: number, push: number }
export interface Funnel { signed_up: number, first_task: number, trial_used: number, paying: number }

export interface DayCost { day: string, requests: number, cost: number }
export interface FeatureUsage { provider: string, model: string, feature: string, requests: number, input_tokens: number, output_tokens: number, audio_seconds: number, cost: number }
export interface AiUserRow { id: string, email: string | null, subscription_status: string, requests: number, cost: number }
export interface GapRow { id: string, email: string | null, subscription_status: string, requests: number, ai_cost: number, paid: number, proceeds: number, margin: number }
export interface GapSummary { users: number, losing: number, ai_cost: number, paid: number, proceeds: number, unpaid_ai_cost: number, total: number }

export interface BillingEventRow { id: string, type: string, product_id: string | null, store: string | null, environment: string | null, period_type: string | null, price_usd: number | null, proceeds: number, event_at: string | null }
