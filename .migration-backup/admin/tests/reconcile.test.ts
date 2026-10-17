import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compare, expectedStatus, revenueTotals, type RcPurchase, type RcSubscription } from '../server/utils/reconcile.ts'

const sub = (over: Partial<RcSubscription>): RcSubscription => ({
  id: 's', product_id: 'monthly', store: 'app_store', environment: 'production', status: 'active',
  gives_access: true, current_period_ends_at: Date.UTC(2030, 0, 1), total_revenue_in_usd: { gross: 7.99, proceeds: 6.79 }, ...over
})
const lifetime: RcPurchase = { id: 'p', product_id: 'lifetime', status: 'owned', store: 'app_store', purchased_at: 0, revenue_in_usd: { gross: 149.99, proceeds: 127.49 } }
const NOW = Date.UTC(2026, 9, 17)

test('expected status from RevenueCat', () => {
  assert.equal(expectedStatus([sub({})], []).status, 'active')
  assert.equal(expectedStatus([sub({ status: 'in_grace_period' })], []).status, 'active')
  const trial = expectedStatus([sub({ status: 'trialing' })], [])
  assert.equal(trial.status, 'trialing')
  assert.equal(trial.trialEndsAt, '2030-01-01T00:00:00.000Z')
  assert.equal(expectedStatus([sub({ status: 'trialing' }), sub({ status: 'active' })], []).status, 'active', 'paid beats trial')
  assert.equal(expectedStatus([sub({ status: 'expired', gives_access: false })], [lifetime]).status, 'active', 'lifetime purchase')
  assert.equal(expectedStatus([sub({ status: 'in_billing_retry', gives_access: false })], []).status, 'past_due')
  assert.equal(expectedStatus([sub({ status: 'expired', gives_access: false })], []).status, 'none')
  assert.equal(expectedStatus([], []).status, 'none')
})

test('compare database status with RevenueCat', () => {
  const active = expectedStatus([sub({})], [])
  const none = expectedStatus([], [])
  assert.equal(compare('none', null, active, NOW), 'locked_out')
  assert.equal(compare('trialing', '2026-01-01', active, NOW), 'locked_out', 'expired db trial')
  assert.equal(compare('active', null, none, NOW), 'free_access')
  assert.equal(compare('pro', null, none, NOW), 'manual_grant')
  assert.equal(compare('pro', null, active, NOW), 'ok')
  assert.equal(compare('active', null, active, NOW), 'ok')
  assert.equal(compare('past_due', null, none, NOW), 'label')
  assert.equal(compare('none', null, none, NOW), 'ok')
})

test('revenue totals', () => {
  const t = revenueTotals([sub({}), sub({ total_revenue_in_usd: null })], [lifetime])
  assert.equal(t.gross.toFixed(2), '157.98')
  assert.equal(t.proceeds.toFixed(2), '134.28')
})
