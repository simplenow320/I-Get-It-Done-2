<script setup lang="ts">
const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ changed: [] }>()
const toast = useToast()

const { data, error } = await useFetch(`/api/users/${props.userId}/billing`)
const verify = ref<Awaited<ReturnType<typeof loadVerify>> | null>(null)
const verifying = ref(false)
const applying = ref(false)
const verifyError = ref('')

const FEATURES: Record<string, string> = { transcribe: 'Voice transcription', extract: 'Task extraction' }
const SEVERITY: Record<string, { text: string, color: 'success' | 'error' | 'warning' | 'info' | 'neutral' }> = {
  ok: { text: 'App status matches RevenueCat', color: 'success' },
  locked_out: { text: 'Paid in RevenueCat but has no access in the app', color: 'error' },
  free_access: { text: 'Has access in the app that RevenueCat does not show', color: 'warning' },
  manual_grant: { text: 'Manual pro grant. RevenueCat shows no purchase', color: 'info' },
  label: { text: 'Same access, different status label', color: 'neutral' }
}

function loadVerify() {
  return $fetch(`/api/users/${props.userId}/verify`)
}

async function runVerify() {
  verifying.value = true
  verifyError.value = ''
  try {
    verify.value = await loadVerify()
  } catch (e: any) {
    verifyError.value = e?.data?.statusMessage ?? 'Could not reach RevenueCat. Try again.'
  } finally {
    verifying.value = false
  }
}

async function applyStatus() {
  applying.value = true
  try {
    const r = await $fetch(`/api/users/${props.userId}/reconcile`, { method: 'POST' })
    toast.add({ title: r.changed ? `Status set to ${r.status}` : 'Already in sync', description: r.reason, color: 'success' })
    emit('changed')
    await runVerify()
  } catch (e: any) {
    toast.add({ title: 'Could not apply RevenueCat status', description: e?.data?.statusMessage ?? 'Try again.', color: 'error' })
  } finally {
    applying.value = false
  }
}

const cost30 = computed(() => data.value?.usage.reduce((s, u) => s + u.cost_30d, 0) ?? 0)
const costAll = computed(() => data.value?.usage.reduce((s, u) => s + u.cost_all, 0) ?? 0)
const paid = computed(() => data.value?.events.reduce((s, e) => s + (e.price_usd ?? 0), 0) ?? 0)
const proceeds = computed(() => data.value?.events.reduce((s, e) => s + e.proceeds, 0) ?? 0)
const ms = (v: number | null) => (v ? new Date(v).toISOString() : null)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-medium">Billing and AI usage</h3>
        <UButton size="sm" icon="i-lucide-scan-search" variant="soft" :loading="verifying" label="Verify with RevenueCat" @click="runVerify" />
      </div>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" :description="error.statusMessage" />
    <template v-else-if="data">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div><div class="text-muted">AI cost, 30 days</div><div class="text-xl font-semibold tabular-nums">{{ formatUsd(cost30) }}</div></div>
        <div><div class="text-muted">AI cost, all time</div><div class="text-xl font-semibold tabular-nums">{{ formatUsd(costAll) }}</div></div>
        <div><div class="text-muted">Paid (recorded)</div><div class="text-xl font-semibold tabular-nums">{{ formatUsd(paid) }}</div></div>
        <div><div class="text-muted">Margin</div><div class="text-xl font-semibold tabular-nums" :class="proceeds - costAll < 0 ? 'text-error' : ''">{{ formatUsd(proceeds - costAll) }}</div></div>
      </div>
      <p class="text-xs text-dimmed mt-1">Recorded payments and AI costs start when the server update is deployed. Margin is proceeds minus AI cost.</p>

      <table v-if="data.usage.length" class="w-full text-sm tabular-nums mt-4">
        <thead><tr class="text-left text-muted"><th class="font-normal py-1">Feature</th><th class="font-normal text-right">Requests</th><th class="font-normal text-right">30 days</th><th class="font-normal text-right">All time</th></tr></thead>
        <tbody>
          <tr v-for="u in data.usage" :key="u.feature + u.provider" class="border-t border-default">
            <td class="py-1">{{ FEATURES[u.feature] ?? u.feature }}</td><td class="text-right">{{ formatNumber(u.requests) }}</td>
            <td class="text-right">{{ formatUsd(u.cost_30d) }}</td><td class="text-right">{{ formatUsd(u.cost_all) }}</td>
          </tr>
        </tbody>
      </table>

      <h4 class="text-sm font-medium mt-5 mb-1">Payment events</h4>
      <table v-if="data.events.length" class="w-full text-sm tabular-nums">
        <thead><tr class="text-left text-muted"><th class="font-normal py-1">When</th><th class="font-normal">Event</th><th class="font-normal">Product</th><th class="font-normal text-right">Price</th></tr></thead>
        <tbody>
          <tr v-for="e in data.events" :key="e.id" class="border-t border-default">
            <td class="py-1 whitespace-nowrap">{{ formatDateTime(e.event_at) }}</td>
            <td>{{ e.type }}<span v-if="e.environment && e.environment !== 'PRODUCTION'" class="text-xs text-warning"> {{ e.environment.toLowerCase() }}</span></td>
            <td class="text-muted">{{ e.product_id ?? '—' }}<span v-if="e.store" class="text-xs text-dimmed"> · {{ e.store }}</span></td>
            <td class="text-right" :class="(e.price_usd ?? 0) < 0 ? 'text-error' : ''">{{ e.price_usd === null ? '—' : formatUsd(e.price_usd) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-sm text-muted">No payment events recorded.</p>
    </template>

    <div v-if="verifyError || verify" class="mt-5 pt-4 border-t border-default">
      <UAlert v-if="verifyError" color="error" variant="subtle" :description="verifyError" icon="i-lucide-circle-alert" />
      <template v-else-if="verify">
        <UAlert :color="SEVERITY[verify.severity]?.color ?? 'neutral'" variant="subtle" :title="SEVERITY[verify.severity]?.text ?? verify.severity"
          :description="`App: ${verify.user.subscription_status}. RevenueCat: ${verify.expected.status} (${verify.expected.reason}).`">
          <template v-if="verify.severity !== 'ok'" #actions>
            <UButton size="xs" :loading="applying" :label="`Set status to ${verify.expected.status}`" @click="applyStatus" />
          </template>
        </UAlert>

        <div class="grid grid-cols-2 gap-4 text-sm mt-4">
          <div><div class="text-muted">Lifetime revenue (RevenueCat)</div><div class="font-semibold tabular-nums">{{ formatUsd(verify.revenue.gross) }} <span class="text-muted font-normal">· {{ formatUsd(verify.revenue.proceeds) }} proceeds</span></div></div>
          <div><div class="text-muted">Recorded by webhook</div><div class="font-semibold tabular-nums">{{ formatUsd(verify.recorded.paid) }} <span class="text-muted font-normal">· {{ formatUsd(verify.recorded.proceeds) }} proceeds</span></div></div>
        </div>

        <table v-if="verify.billing.subscriptions.length || verify.billing.purchases.length" class="w-full text-sm mt-4">
          <thead><tr class="text-left text-muted"><th class="font-normal py-1">Product</th><th class="font-normal">Status</th><th class="font-normal">Period ends</th><th class="font-normal text-right">Revenue</th></tr></thead>
          <tbody>
            <tr v-for="s in verify.billing.subscriptions" :key="s.id" class="border-t border-default">
              <td class="py-1">{{ s.product_id }} <span class="text-xs text-dimmed">{{ s.store }}<template v-if="s.environment !== 'production'"> · {{ s.environment }}</template></span></td>
              <td><UBadge :color="s.gives_access ? 'success' : 'neutral'" variant="subtle" :label="s.status" /></td>
              <td>{{ formatDateTime(ms(s.current_period_ends_at)) }}</td>
              <td class="text-right tabular-nums">{{ formatUsd(s.total_revenue_in_usd?.gross) }}</td>
            </tr>
            <tr v-for="p in verify.billing.purchases" :key="p.id" class="border-t border-default">
              <td class="py-1">{{ p.product_id }} <span class="text-xs text-dimmed">{{ p.store }} · one-time</span></td>
              <td><UBadge :color="p.status === 'owned' ? 'success' : 'neutral'" variant="subtle" :label="p.status" /></td>
              <td>bought {{ formatDate(ms(p.purchased_at)) }}</td>
              <td class="text-right tabular-nums">{{ formatUsd(p.revenue_in_usd?.gross) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-sm text-muted mt-3">RevenueCat has no purchases for this user.</p>
      </template>
    </div>
  </UCard>
</template>
